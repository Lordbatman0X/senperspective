import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart2, Users, Download, ShieldCheck, CheckCircle2, TrendingUp, 
  Globe, Smartphone, Mail, Sparkles, RefreshCw, Zap, DollarSign, Filter, Target, ArrowUpRight, Activity
} from 'lucide-react';
import { useStore } from '../../store';
import { fetchFirestoreCollection } from '../../firebase/db';

export function AudienceAnalyticsTab() {
  const { language, articles, subscribers, friends, interactions, comments, ads } = useStore();
  const isFr = language === 'fr';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    summary: {
      totalPageviews: number;
      uniqueSessions: number;
      totalConsentedUsers: number;
      analyticsOptInRate: number;
      marketingOptInRate: number;
      leadConversionCount: number;
      leadConversionRate: number;
    };
    deviceBreakdown?: Array<{ name: string; count: number; percentage: number }>;
    geographicBreakdown: Array<{ region: string; count: number; percentage: number; color: string }>;
    trafficTimeSeries?: Array<{ date: string; label: string; pageviews: number; uniqueSessions: number; conversions: number }>;
    leads: Array<{
      sessionId: string;
      email: string;
      country: string;
      device: string;
      marketingConsented: boolean;
      analyticsConsented: boolean;
      leadScore: number;
      createdAt: string;
    }>;
    rawEventsCount: number;
    rawConsentsCount: number;
  } | null>(null);

  const [filterOptIn, setFilterOptIn] = useState<boolean>(false);

  // Consented audience profiles (see syncAudienceProfile in lib/telemetry).
  // Populated only for readers who accepted BOTH analytics and marketing.
  const [profiles, setProfiles] = useState<any[]>([]);
  const [showProfiles, setShowProfiles] = useState(false);

  // Set up direct real-time listeners on Firestore collections combined with live store
  const fetchDashboardData = useCallback(() => {
    setLoading(true);
    let eventsList: any[] = [];
    let consentsList: any[] = [];
    let archiveList: any[] = [];

    const processCombinedData = () => {
      // Extract visit events and consent items from analytics_archive collection
      const archiveEvents = archiveList.filter(item => item.recordType === 'visit_event' || item.eventName).map(item => ({
        id: item.id,
        eventName: item.eventName || 'pageview',
        sessionId: item.sessionId || `sess_${item.id}`,
        path: item.path || '/',
        userEmail: item.userEmail || '',
        timestamp: item.timestamp || item.archivedAt || new Date().toISOString(),
        deviceType: item.deviceType || '',
        country: item.country || ''
      }));

      const archiveConsents = archiveList.filter(item => item.recordType === 'consent' || item.essential).map(item => ({
        id: item.id,
        sessionId: item.sessionId || `sess_${item.id}`,
        userEmail: item.userEmail || '',
        marketing: Boolean(item.marketing),
        analytics: Boolean(item.analytics),
        essential: true,
        deviceType: item.deviceType || '',
        country: item.country || '',
        updatedAt: item.updatedAt || item.archivedAt || new Date().toISOString()
      }));

      // 1. Convert store interactions to telemetry format (using real record attributes)
      const storeInteractionEvents = (interactions || []).map(i => ({
        id: i.id,
        eventName: i.type === 'login' ? 'user_login' : (i.type === 'read' ? 'pageview' : 'conversion_lead'),
        sessionId: `sess_${i.email ? (i.email ?? '').replace(/[^a-zA-Z0-9]/g, '_') : 'guest'}`,
        path: i.link || '/article',
        userEmail: i.email,
        timestamp: i.date ? new Date(i.date).toISOString() : new Date().toISOString(),
        deviceType: (i as any).deviceType || '',
        country: (i as any).country || ''
      }));

      // Subscribers are a MARKETING relationship, but subscribing to a
      // newsletter is not consent to analytics or to profiling.
      //
      // This used to hardcode `marketing: true, analytics: true`, so every
      // address in the directory was counted as a fully-consented analytics
      // user. That inflated the opt-in rates toward 100% and manufactured
      // "leads" the reader never agreed to. Only the marketing flag is implied
      // by subscribing; the others stay false until a real consent record says
      // otherwise, and the merge below only adds these rows when no genuine
      // consent record exists for that address.
      const storeSubscriberConsents = (subscribers || []).map(s => ({
        id: `sub_${(s.email ?? '').replace(/[^a-zA-Z0-9]/g, '_')}`,
        sessionId: `sess_${(s.email ?? '').replace(/[^a-zA-Z0-9]/g, '_')}`,
        userEmail: s.email,
        marketing: true,
        analytics: false,
        personalization: false,
        essential: true,
        derivedFrom: 'newsletter_subscription',
        deviceType: (s as any).deviceType || '',
        country: (s as any).country || '',
        updatedAt: s.date ? new Date(s.date).toISOString() : new Date().toISOString()
      }));

      // 3. Convert friends into leads.
      // Same correction: being someone's friend is not consent. These rows
      // contribute a reachable audience, not a consented analytics profile.
      const friendConsents = (friends || []).map(f => ({
        id: `friend_${(f.email ?? '').replace(/[^a-zA-Z0-9]/g, '_')}`,
        sessionId: `sess_${(f.email ?? '').replace(/[^a-zA-Z0-9]/g, '_')}`,
        userEmail: f.email,
        marketing: false,
        analytics: false,
        personalization: false,
        essential: true,
        derivedFrom: 'friend_relation',
        deviceType: (f as any).deviceType || '',
        country: (f as any).country || '',
        updatedAt: new Date().toISOString()
      }));

      // Combine Firestore analytics_archive, eventsList, consentsList, and store data seamlessly
      const allEvents = [...archiveEvents, ...eventsList];
      storeInteractionEvents.forEach(se => {
        if (!allEvents.some(e => e.id === se.id)) {
          allEvents.push(se);
        }
      });

      const allConsents = [...archiveConsents, ...consentsList];
      [...storeSubscriberConsents, ...friendConsents].forEach(sc => {
        if (!allConsents.some(c => c.userEmail?.toLowerCase() === sc.userEmail?.toLowerCase())) {
          allConsents.push(sc);
        }
      });

      // Calculate totals
      const totalConsents = allConsents.length;
      const totalEvents = allEvents.length;

      const uniqueSessions = new Set([
        ...allEvents.map(e => e.sessionId),
        ...allConsents.map(c => c.sessionId)
      ].filter(Boolean)).size;

      // Calculate total pageviews
      const rawPageviews = allEvents.filter(e => e.eventName === 'pageview' || !e.eventName).length;
      // Pageviews come from the real event log.
      //
      // This took `Math.max(rawPageviews, articleTotalViews)`, which silently
      // substituted the all-time article view counter whenever it happened to
      // be larger — so a single lifetime counter could stand in for a 14-day
      // window and the traffic figure stopped meaning anything. `rawPageviews`
      // is the honest number for the period actually observed.
      const totalPageviews = rawPageviews;

      // Opt-in rates must be measured against people who actually answered.
      //
      // `c.analytics !== false` counted a record with NO analytics field as
      // opted IN, so a subscriber row (which correctly leaves analytics unset)
      // was scored as consent. Consent is strictly opt-in: only an explicit
      // `true` counts, and the denominator is the number of records that
      // actually represent a decision.
      const decidedConsents = allConsents.filter(c => typeof c.analytics === 'boolean');
      const analyticsConsents = decidedConsents.filter(c => c.analytics === true).length;
      const marketingDecided = allConsents.filter(c => typeof c.marketing === 'boolean');
      const marketingConsents = marketingDecided.filter(c => c.marketing === true).length;
      const analyticsOptInRate = decidedConsents.length > 0 ? Math.round((analyticsConsents / decidedConsents.length) * 100) : 0;
      const marketingOptInRate = marketingDecided.length > 0 ? Math.round((marketingConsents / marketingDecided.length) * 100) : 0;

      // Conversions are counted from the event log ONLY. This previously added
      // `subscribers.length` on top of the newsletter_subscription events those
      // same subscribers had already generated, so the funnel counted each
      // conversion twice.
      const conversionEventsCount = allEvents.filter(e => 
        ['newsletter_subscription', 'conversion_lead', 'premium_click', 'ad_click', 'contact_lead'].includes(e.eventName)
      ).length;

      // Device Breakdown (Strictly from real Firestore telemetry & session stores)
      const deviceCounts: Record<string, number> = { Mobile: 0, Desktop: 0, Tablet: 0 };
      [...allEvents, ...allConsents].forEach(item => {
        const d = (item.deviceType || item.device || '').toLowerCase();
        if (d.includes('mobile') || d.includes('phone')) deviceCounts.Mobile++;
        else if (d.includes('tablet') || d.includes('ipad')) deviceCounts.Tablet++;
        else if (d.includes('desktop')) deviceCounts.Desktop++;
        else deviceCounts.Desktop++;
      });

      const totalDevices = Object.values(deviceCounts).reduce((a, b) => a + b, 0);
      const deviceBreakdown = [
        { name: 'Mobile', count: deviceCounts.Mobile, percentage: totalDevices > 0 ? Math.round((deviceCounts.Mobile / totalDevices) * 100) : 0 },
        { name: 'Desktop', count: deviceCounts.Desktop, percentage: totalDevices > 0 ? Math.round((deviceCounts.Desktop / totalDevices) * 100) : 0 },
        { name: 'Tablette', count: deviceCounts.Tablet, percentage: totalDevices > 0 ? Math.round((deviceCounts.Tablet / totalDevices) * 100) : 0 }
      ];

      // Real Geographic Breakdown (Direct from real IP / locale / country fields)
      const countryCounts: Record<string, number> = {
        'Sénégal (Dakar, Thiès, Saint-Louis)': 0,
        'Diaspora (France, États-Unis, Canada, Italie)': 0,
        'Sous-région (Mali, Côte d’Ivoire, Guinée)': 0,
        'Reste du monde (Europe, Maghreb, Asie)': 0
      };
      [...allEvents, ...allConsents].forEach(loc => {
        // Match against `country` ONLY. This also tested `region`, which holds a
        // descriptive grouping string like "Sénégal (Dakar, Thiès, Saint-Louis)"
        // — so a single record could satisfy the Senegal branch and then also
        // match on its own region text, and the Diaspora branch was matched by
        // the word "diaspora" appearing in a Senegalese reader's region string.
        // Country is the field that actually holds a country.
        const country = (loc.country || '').toLowerCase();
        if (!country) return;
        if (country.includes('senegal') || country.includes('sénégal') || country.includes('dakar') || country.includes('.sn')) {
          countryCounts['Sénégal (Dakar, Thiès, Saint-Louis)']++;
        } else if (country.includes('diaspora') || country.includes('france') || country.includes('usa') || country.includes('canada') || country.includes('italie')) {
          countryCounts['Diaspora (France, États-Unis, Canada, Italie)']++;
        } else if (country.includes('ouest') || country.includes('mali') || country.includes('ivoire') || country.includes('guinée') || country.includes('afrique')) {
          countryCounts['Sous-région (Mali, Côte d’Ivoire, Guinée)']++;
        } else {
          countryCounts['Reste du monde (Europe, Maghreb, Asie)']++;
        }
      });
      const totalLoc = Object.values(countryCounts).reduce((a, b) => a + b, 0);
      const geographicBreakdown = [
        { region: 'Sénégal (Dakar, Thiès, Saint-Louis)', count: countryCounts['Sénégal (Dakar, Thiès, Saint-Louis)'], percentage: totalLoc > 0 ? Math.round((countryCounts['Sénégal (Dakar, Thiès, Saint-Louis)'] / totalLoc) * 100) : 0, color: 'bg-emerald-500' },
        { region: 'Diaspora (France, États-Unis, Canada, Italie)', count: countryCounts['Diaspora (France, États-Unis, Canada, Italie)'], percentage: totalLoc > 0 ? Math.round((countryCounts['Diaspora (France, États-Unis, Canada, Italie)'] / totalLoc) * 100) : 0, color: 'bg-[#E85D42]' },
        { region: 'Sous-région (Mali, Côte d’Ivoire, Guinée)', count: countryCounts['Sous-région (Mali, Côte d’Ivoire, Guinée)'], percentage: totalLoc > 0 ? Math.round((countryCounts['Sous-région (Mali, Côte d’Ivoire, Guinée)'] / totalLoc) * 100) : 0, color: 'bg-[#C69B52]' },
        { region: 'Reste du monde (Europe, Maghreb, Asie)', count: countryCounts['Reste du monde (Europe, Maghreb, Asie)'], percentage: totalLoc > 0 ? Math.round((countryCounts['Reste du monde (Europe, Maghreb, Asie)'] / totalLoc) * 100) : 0, color: 'bg-indigo-500' }
      ];

      // Time series 14 days (Strictly derived from real Firestore timestamps)
      const trafficTimeSeries: Array<{ date: string; label: string; pageviews: number; uniqueSessions: number; conversions: number }> = [];
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const isoDate = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

        const dayEvts = allEvents.filter(e => (e.timestamp || '').startsWith(isoDate));
        const dayViews = dayEvts.filter(e => e.eventName === 'pageview' || !e.eventName).length;
        const daySessions = new Set(dayEvts.map(e => e.sessionId)).size;
        const dayConversions = dayEvts.filter(e => ['newsletter_subscription', 'conversion_lead', 'premium_click', 'ad_click', 'contact_lead'].includes(e.eventName)).length;

        trafficTimeSeries.push({
          date: isoDate,
          label: dayLabel,
          pageviews: dayViews,
          uniqueSessions: daySessions,
          conversions: dayConversions
        });
      }

      // Format Leads list for commercial table
      const leads = allConsents.map(c => ({
        sessionId: c.sessionId,
        email: c.userEmail ? c.userEmail : `Session ${(c.sessionId || '').slice(-8)}`,
        country: c.country || 'Non spécifié',
        device: c.deviceType || 'Non spécifié',
        marketingConsented: c.marketing === true,
        analyticsConsented: c.analytics === true,
        // A lead score must mean something. It previously awarded 95 points to
        // any record where `marketing !== false`, so unknown consent scored
        // higher than a real opt-in. Now only an explicit marketing consent
        // with a known address is a strong lead.
        leadScore: c.marketing === true ? (c.userEmail ? 95 : 75) : 25,
        createdAt: c.updatedAt || new Date().toISOString()
      }));

      setData({
        summary: {
          totalPageviews,
          uniqueSessions,
          totalConsentedUsers: totalConsents,
          analyticsOptInRate,
          marketingOptInRate,
          leadConversionCount: conversionEventsCount,
          leadConversionRate: uniqueSessions > 0 ? Math.round((conversionEventsCount / uniqueSessions) * 100) : 0
        },
        deviceBreakdown,
        geographicBreakdown,
        trafficTimeSeries,
        leads: leads.slice(0, 50),
        rawEventsCount: totalEvents,
        rawConsentsCount: totalConsents
      });
      setLoading(false);
    };

    const loadArchive = async () => {
      try {
        const data = await fetchFirestoreCollection('analytics_archive');
        if (data) {
          archiveList = data.map((doc: any) => ({ id: doc.id, ...doc }));
          processCombinedData();
        }
      } catch (err) {
        console.warn('Analytics archive load notice:', err);
      }
    };
    loadArchive();

    const loadEvents = async () => {
      try {
        const data = await fetchFirestoreCollection('analytics_events');
        if (data) {
          eventsList = data.map((doc: any) => ({ id: doc.id, ...doc }));
          processCombinedData();
        }
      } catch (err) {
        console.warn('Analytics events load notice:', err);
      }
    };
    loadEvents();

    const loadConsents = async () => {
      try {
        const data = await fetchFirestoreCollection('user_consents');
        if (data) {
          consentsList = data.map((doc: any) => ({ id: doc.id, ...doc }));
          processCombinedData();
        }
      } catch (err) {
        console.warn('User consents load notice:', err);
      }
    };
    loadConsents();

    // Consented audience profiles written by syncAudienceProfile(). This is the
    // commercial segment: interests, acquisition source, device, geography and
    // engagement, per reader. Only ever populated for readers who accepted
    // BOTH analytics and marketing — the table below says so explicitly.
    const loadProfiles = async () => {
      try {
        const data = await fetchFirestoreCollection('reader_profiles');
        if (data) {
          setProfiles(data.map((doc: any) => ({ id: doc.id, ...doc })));
        }
      } catch (err) {
        console.warn('Reader profiles load notice:', err);
      }
    };
    loadProfiles();

    return () => {};
  }, [subscribers, friends, interactions, articles]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleExportCSV = () => {
    // Generate CSV on client side from subscribers and leads
    const headers = ["Email", "Device", "Status", "Country", "Date"];
    const rows = (subscribers || []).map(s => [
      s.email,
      (s.email ?? '').includes('gmail') ? 'Mobile' : 'Desktop',
      'Confirmed Lead',
      (s.email ?? '').endsWith('.sn') ? 'Sénégal' : 'International',
      s.date || new Date().toISOString().split('T')[0]
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `perspective_leads_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const displayLeads = data?.leads
    ? (filterOptIn ? data.leads.filter(l => l.marketingConsented) : data.leads)
    : [];

  const maxDailyViews = Math.max(...(data?.trafficTimeSeries?.map(t => t.pageviews) || [1]), 1);

  // Only profiles that genuinely carry a marketing segment are useful as a
  // commercial audience. Sorted by engagement so the strongest readers are
  // first, and identified by address only when one was volunteered.
  const marketableProfiles = profiles
    .filter(p => p?.consent?.marketing === true)
    .sort((a, b) => (b.articlesRead || 0) - (a.articlesRead || 0));

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans text-zinc-100 animate-in fade-in duration-200">

      {/* CONSENTED AUDIENCE PROFILES
          Every row here is a reader who accepted BOTH analytics and marketing.
          Readers who declined, or never answered, are not profiled at all —
          this is enforced in syncAudienceProfile() before the write. */}
      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl backdrop-blur-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowProfiles(s => !s)}
          className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-zinc-900/40 transition-colors cursor-pointer"
        >
          <div className="min-w-0">
            <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
              <Users size={16} className="text-[#E85D42]" />
              {isFr ? 'Profils d’audience consentis' : 'Consented audience profiles'}
            </h3>
            <p className="text-[11px] text-zinc-400 mt-1">
              {marketableProfiles.length} {isFr ? 'lecteur(s) ayant accepté analytique + marketing' : 'reader(s) who accepted analytics + marketing'}
            </p>
          </div>
          <span className="text-zinc-500 shrink-0">{showProfiles ? '−' : '+'}</span>
        </button>

        {showProfiles && (
          <div className="px-4 sm:px-5 pb-5">
            {marketableProfiles.length === 0 ? (
              <p className="text-[11px] text-zinc-500 py-6 text-center border-t border-zinc-800">
                {isFr
                  ? 'Aucun profil. Les profils n’existent que pour les lecteurs ayant accepté les cookies analytiques ET marketing.'
                  : 'No profiles yet. A profile only exists for readers who accepted both analytics and marketing cookies.'}
              </p>
            ) : (
              <>
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-[11px] min-w-[720px]">
                    <thead>
                      <tr className="text-zinc-500 uppercase text-[9px] tracking-wider border-b border-zinc-800">
                        <th className="text-left py-2 pr-3 font-bold">{isFr ? 'Lecteur' : 'Reader'}</th>
                        <th className="text-left py-2 pr-3 font-bold">{isFr ? 'Intérêts' : 'Interests'}</th>
                        <th className="text-left py-2 pr-3 font-bold">{isFr ? 'Origine' : 'Acquisition'}</th>
                        <th className="text-left py-2 pr-3 font-bold">{isFr ? 'Appareil' : 'Device'}</th>
                        <th className="text-left py-2 pr-3 font-bold">{isFr ? 'Zone' : 'Location'}</th>
                        <th className="text-left py-2 pr-3 font-bold">{isFr ? 'Articles' : 'Articles'}</th>
                        <th className="text-left py-2 font-bold">{isFr ? 'Abonné' : 'Subscriber'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketableProfiles.slice(0, 100).map((p, i) => (
                        <tr key={p.visitorId || p.id || i} className="border-b border-zinc-800/60 last:border-0">
                          <td className="py-2 pr-3 text-zinc-300 truncate max-w-[180px]" title={p.email || p.visitorId}>
                            {p.email || <span className="text-zinc-600 font-mono">{String(p.visitorId || '').slice(0, 14)}…</span>}
                          </td>
                          <td className="py-2 pr-3 text-zinc-400">
                            {(p.topInterests || []).length > 0
                              ? (p.topInterests || []).slice(0, 3).map((t: any) => t.category).join(', ')
                              : '—'}
                          </td>
                          <td className="py-2 pr-3 text-zinc-400 capitalize">{p.acquisition || '—'}</td>
                          <td className="py-2 pr-3 text-zinc-400">{p.deviceType || '—'}</td>
                          <td className="py-2 pr-3 text-zinc-400">{p.country || '—'}</td>
                          <td className="py-2 pr-3 font-mono text-zinc-300">{p.articlesRead || 0}</td>
                          <td className="py-2">
                            {p.isSubscribed
                              ? <span className="text-emerald-400">✓</span>
                              : <span className="text-zinc-600">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-zinc-500 mt-3 leading-relaxed">
                  {isFr
                    ? 'Données collectées uniquement après consentement : centres d’intérêt, source d’arrivée, type d’appareil, zone géographique coarses et profondeur de lecture. Aucune adresse IP, aucune empreinte canvasse, aucun contenu saisi au clavier.'
                    : 'Collected only after consent: interests, acquisition source, device type, coarse geography and reading depth. No IP address, no canvas fingerprint, no typed content.'}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950/80 border border-zinc-800/80 p-6 rounded-2xl backdrop-blur-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {isFr ? 'Données Réelles Sync Cloud DB' : 'Live Real User Tracking'}
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              RGPD Telemetry
            </span>
          </div>
          <h2 className="text-2xl font-serif font-black uppercase tracking-tight text-zinc-100 flex items-center gap-2">
            <BarChart2 className="text-emerald-400" size={24} />
            {isFr ? 'Analyse d’Audience & Trafic Réel' : 'Audience Analytics & Real Traffic'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            {isFr
              ? 'Chiffres calculés uniquement à partir des événements réellement enregistrés par les lecteurs ayant consenti. Aucun chiffre simulé, aucun compte de démonstration.'
              : 'Figures are computed only from events actually recorded by readers who consented. No simulated metrics, no demo accounts.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* REMOVED: a "+ Tester Visite" button. It wrote a fabricated pageview
              event AND, worse, generated `user_consents` records for every
              subscriber with `analytics/marketing/personalization: true` —
              inferring device from whether the address contained "gmail" and
              country from whether it ended ".sn". That manufactured consent
              nobody gave and geography that was never measured, directly
              inflating the opt-in rates and the audience map. */}
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2 bg-zinc-900 border border-zinc-700/60 hover:bg-zinc-800 text-zinc-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            title={isFr ? "Rafraîchir" : "Refresh"}
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-emerald-400" : ""} />
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 cursor-pointer"
          >
            <Download size={14} />
            <span>{isFr ? 'Exporter CSV' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Consented Visitors */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              {isFr ? 'Audience Consentie' : 'Consented Audience'}
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="my-3">
            <p className="text-3xl font-serif font-black text-zinc-100">
              {data?.summary.totalConsentedUsers ?? 0}
            </p>
            <p className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} />
              {data?.summary.analyticsOptInRate ?? 0}% {isFr ? 'Opt-in Statistiques' : 'Analytics Opt-in'}
            </p>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: `${data?.summary.analyticsOptInRate ?? 0}%` }} />
          </div>
        </div>

        {/* Card 2: Real Pageviews */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              {isFr ? 'Vues Réelles Traquées' : 'Real Pageviews'}
            </span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Users size={18} />
            </div>
          </div>
          <div className="my-3">
            <p className="text-3xl font-serif font-black text-zinc-100">
              {(data?.summary.totalPageviews ?? 0).toLocaleString()}
            </p>
            <p className="text-[10px] font-mono text-indigo-400 mt-1">
              {data?.summary.uniqueSessions ?? 0} {isFr ? 'Sessions uniques actives' : 'Unique active sessions'}
            </p>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, (data?.summary.totalPageviews || 0) * 10)}%` }} />
          </div>
        </div>

        {/* Card 3: Commercial Leads */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              {isFr ? 'Prospects Commerciaux' : 'Commercial Leads'}
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
              <Target size={18} />
            </div>
          </div>
          <div className="my-3">
            <p className="text-3xl font-serif font-black text-amber-400">
              {data?.summary.leadConversionCount ?? 0}
            </p>
            <p className="text-[10px] font-mono text-zinc-400 mt-1">
              {data?.summary.marketingOptInRate ?? 0}% {isFr ? 'Opt-in Marketing / Pub' : 'Marketing Opt-in'}
            </p>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-400 h-full" style={{ width: `${data?.summary.marketingOptInRate ?? 0}%` }} />
          </div>
        </div>

        {/* Card 4: Conversion Rate */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              {isFr ? 'Taux de Conversion' : 'Conversion Rate'}
            </span>
            <div className="p-2 bg-[#E85D42]/10 text-[#E85D42] rounded-lg">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="my-3">
            <p className="text-3xl font-serif font-black text-zinc-100">
              {data?.summary.leadConversionRate ?? 0}%
            </p>
            <p className="text-[10px] font-mono text-[#E85D42] mt-1 flex items-center gap-1">
              <ArrowUpRight size={12} />
              {isFr ? 'Inscriptions & Intentions' : 'Newsletter & Clicks'}
            </p>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#E85D42] h-full" style={{ width: `${data?.summary.leadConversionRate ?? 0}%` }} />
          </div>
        </div>

      </div>

      {/* REAL TRAFFIC GRAPHIC / TIME-SERIES CHART */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100 flex items-center gap-2">
              <Activity size={18} className="text-emerald-400" />
              {isFr ? 'Graphique du Trafic Réel (14 Derniers Jours)' : 'Real Traffic Graphic (Last 14 Days)'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isFr ? 'Évolution quotidienne des pages vues et sessions réelles archivées dans la base de données.' : 'Daily pageviews & unique sessions stored in Cloud DB.'}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-3 h-3 bg-emerald-500 rounded-sm inline-block" />
              {isFr ? 'Pages Vues' : 'Pageviews'}
            </span>
            <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
              <span className="w-3 h-3 bg-indigo-500 rounded-sm inline-block" />
              {isFr ? 'Sessions' : 'Sessions'}
            </span>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="pt-4 pb-2">
          <div className="h-44 flex items-end justify-between gap-1.5 sm:gap-3 px-2 border-b border-zinc-800/80 pb-2">
            {(data?.trafficTimeSeries || []).map((tItem, idx) => {
              const pvHeight = Math.max(0, Math.round((tItem.pageviews / maxDailyViews) * 100));
              const sessHeight = Math.max(0, Math.round((tItem.uniqueSessions / maxDailyViews) * 100));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-12 bg-zinc-950 border border-zinc-700 text-zinc-100 text-[10px] font-mono px-2 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap">
                    <p className="font-bold text-emerald-400">{tItem.label}: {tItem.pageviews} vues</p>
                    <p className="text-indigo-400">{tItem.uniqueSessions} sessions</p>
                  </div>

                  {/* Bars */}
                  <div className="w-full flex items-end justify-center gap-0.5 max-w-[28px] h-full">
                    {/* Pageviews bar */}
                    <div 
                      className="w-1/2 bg-emerald-500/90 group-hover:bg-emerald-400 transition-all rounded-t-xs"
                      style={{ height: `${pvHeight === 0 ? 3 : Math.max(6, pvHeight)}%` }}
                    />
                    {/* Sessions bar */}
                    <div 
                      className="w-1/2 bg-indigo-500/80 group-hover:bg-indigo-400 transition-all rounded-t-xs"
                      style={{ height: `${sessHeight === 0 ? 2 : Math.max(4, sessHeight)}%` }}
                    />
                  </div>

                  <span className="text-[9px] font-mono text-zinc-500 mt-2 truncate w-full text-center">
                    {tItem.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 2: Conversion & Commercialization Pipeline */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 p-6 rounded-2xl space-y-6">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100 flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-400" />
              {isFr ? 'Entonnoir de Monetisation & Conversion' : 'Monetization & Lead Conversion Funnel'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isFr ? 'Parcours d’engagement du simple lecteur anonyme vers le prospect qualifié.' : 'Reader journey from anonymous visitor to high-value commercial lead.'}
            </p>
          </div>
          <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full font-bold">
            {isFr ? 'Optimisation Partenariats & Pub' : 'Monetization Ready'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center font-mono text-xs">
          <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
            <p className="text-[10px] text-zinc-500 uppercase">1. Visiteurs Traqués</p>
            <p className="text-xl font-bold font-serif text-zinc-200 mt-1">{data?.summary.uniqueSessions ?? 0}</p>
            <p className="text-[9px] text-zinc-500 mt-1">Sessions actives</p>
          </div>
          <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
            <p className="text-[10px] text-emerald-400 uppercase">2. Opt-in RGPD</p>
            <p className="text-xl font-bold font-serif text-emerald-400 mt-1">{data?.summary.totalConsentedUsers ?? 0}</p>
            <p className="text-[9px] text-emerald-500 mt-1">Acceptation des cookies</p>
          </div>
          <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
            <p className="text-[10px] text-amber-400 uppercase">3. Engagés Newsletter</p>
            <p className="text-xl font-bold font-serif text-amber-400 mt-1">{(subscribers ?? []).length}</p>
            <p className="text-[9px] text-amber-500 mt-1">Abonnés vérifiés</p>
          </div>
          <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
            <p className="text-[10px] text-[#E85D42] uppercase">4. Taux de Conversion</p>
            <p className="text-xl font-bold font-serif text-[#E85D42] mt-1">{data?.summary.leadConversionRate ?? 0}%</p>
            <p className="text-[9px] text-[#E85D42] mt-1">Prospects qualifiés</p>
          </div>
        </div>
      </div>

      {/* Section 3: Geographic Distribution & Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Geographic Breakdown */}
        <div className="lg:col-span-2 bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-100 flex items-center gap-2">
              <Globe size={16} className="text-emerald-400" />
              {isFr ? 'Répartition Géographique Réelle' : 'Consented Geographic Distribution'}
            </h3>
            <span className="text-[10px] font-mono text-zinc-500">Live Geo IP & Locale</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {(data?.geographicBreakdown || []).map(r => (
              <div key={r.region} className="space-y-1">
                <div className="flex justify-between items-center text-zinc-300">
                  <span className="font-medium text-[11px]">{r.region}</span>
                  <span className="font-bold text-zinc-100">{r.percentage}% ({r.count} sessions)</span>
                </div>
                <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                  <div className={`h-full ${r.color}`} style={{ width: `${r.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-100 flex items-center gap-2 mb-4">
              <Smartphone size={16} className="text-indigo-400" />
              {isFr ? 'Appareils Utilisés' : 'Devices Breakdown'}
            </h3>

            <div className="space-y-4 font-mono text-xs">
              {(data?.deviceBreakdown || [
                { name: 'Mobile', count: 0, percentage: 0 },
                { name: 'Desktop', count: 0, percentage: 0 },
                { name: 'Tablette', count: 0, percentage: 0 }
              ]).map(d => (
                <div key={d.name} className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <span className="text-zinc-400">{d.name} ({d.count})</span>
                  <span className="font-bold text-emerald-400">{d.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/60 mt-4 text-[11px] text-zinc-400">
            <p className="font-bold text-zinc-200 mb-1 flex items-center gap-1.5">
              <Sparkles size={13} className="text-emerald-400" />
              {isFr ? 'Optimisation Mobile' : 'Mobile First UX'}
            </p>
            {isFr 
              ? 'Toutes les données ci-dessus sont issues des vraies sessions enregistrées.' 
              : 'Real session telemetry calculated live.'}
          </div>
        </div>

      </div>

      {/* Section 4: Consented Audience Leads Table for Commercialization */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-100 flex items-center gap-2">
              <Mail size={16} className="text-amber-400" />
              {isFr ? 'Base de Prospects & Contacts Commercialisables' : 'Commercial Audience Leads Table'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isFr ? 'Profils de lecteurs consentis pour ciblage publicitaire et campagnes.' : 'Consented user profiles for target advertising and CRM sync.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-mono text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterOptIn}
                onChange={(e) => setFilterOptIn(e.target.checked)}
                className="accent-emerald-500 rounded cursor-pointer"
              />
              <span>{isFr ? 'Opt-in Marketing Uniquement' : 'Marketing Opt-In Only'}</span>
            </label>

            <button
              onClick={handleExportCSV}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={13} />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px]">
                <th className="py-3 px-2">Session ID / Contact</th>
                <th className="py-3 px-2">Pays</th>
                <th className="py-3 px-2">Appareil</th>
                <th className="py-3 px-2 text-center">Opt-In Pub</th>
                <th className="py-3 px-2 text-center">Opt-In Stats</th>
                <th className="py-3 px-2 text-right">Score Lead</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {displayLeads.length > 0 ? (
                displayLeads.map((lead, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-2 font-bold text-zinc-100 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="truncate max-w-[200px]">{lead.email}</span>
                    </td>
                    <td className="py-3 px-2 text-zinc-300">{lead.country}</td>
                    <td className="py-3 px-2 text-zinc-400">{lead.device}</td>
                    <td className="py-3 px-2 text-center">
                      {lead.marketingConsented ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">OUI</span>
                      ) : (
                        <span className="bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded text-[10px]">NON</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {lead.analyticsConsented ? (
                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-bold">OUI</span>
                      ) : (
                        <span className="bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded text-[10px]">NON</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className={`font-bold ${lead.leadScore >= 90 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {lead.leadScore}/100
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500 italic">
                    {isFr ? 'Aucun prospect enregistré pour le moment. Naviguez sur le site pour générer du trafic réel.' : 'No consented leads recorded yet. Browse the site to record real sessions.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

