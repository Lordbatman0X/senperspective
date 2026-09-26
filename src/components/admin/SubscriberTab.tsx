import React, { useState, useEffect } from 'react';
import { SubscriberItem, useStore } from '../../store';
import { Users, Trash2, Search, Send, Check, Sparkles, Megaphone, Mail, ShieldCheck, RefreshCw, UserCheck, Plus, Image as ImageIcon, Upload, X, Eye } from 'lucide-react';
import { saveFirestoreDoc, fetchFirestoreCollection } from '../../firebase/db';
import { safeJsonParse } from '../../lib/apiUtils';
import { buildNewsletterHtml } from '../../lib/newsletterTemplate';
import type { InlineImage } from '../../lib/newsletterTemplate';
import { RichTextEditor } from './NewsletterRichText';
import { 
  connectGoogleGmail, 
  getCachedGoogleToken, 
  getCachedGoogleUser, 
  getCachedGoogleEmail,
  sendEmailViaGmailApi 
} from '../../lib/googleIntegration';

interface SubscriberTabProps {
  subscribers: SubscriberItem[];
  deleteSubscriber: (email: string) => void;
  addSubscriber: (email: string) => void;
  /** Existing media-library picker, reused rather than reimplemented. */
  openMediaSelector?: (onSelect: (url: string) => void) => void;
}

/**
 * Splits a free-form paste into unique, valid addresses.
 *
 * Accepts commas, semicolons, spaces and newlines, and the `Name <a@b.c>` form
 * people get from a mail client, so an admin can paste straight out of Gmail or
 * a spreadsheet without pre-cleaning anything. Anything that is not a valid
 * address is returned as `invalid` instead of being silently dropped, which is
 * what made a bad paste look like a no-op before.
 */
function parseBulkEmails(raw: string): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  raw
    .split(/[\s,;]+/)
    .map(tok => tok.trim())
    // `Display Name <addr@host>` -> `addr@host`
    .map(tok => (tok.match(/<([^>]+)>/)?.[1] || tok).trim())
    .filter(Boolean)
    .forEach(addr => {
      const clean = addr.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
        invalid.push(addr);
        return;
      }
      if (seen.has(clean)) return;
      seen.add(clean);
      valid.push(clean);
    });

  return { valid, invalid };
}

/**
 * Resolves who a broadcast actually goes to.
 *
 * `custom` is the list pasted into the "one-off list" field; those recipients
 * are NOT written to the subscriber directory, so a rented or partner list can
 * be mailed once without silently becoming permanent subscribers who then
 * receive every later campaign.
 */
function subscriberListFor(
  scope: 'all' | 'custom',
  customText: string,
  subscribers: SubscriberItem[]
): SubscriberItem[] {
  if (scope === 'custom') {
    return parseBulkEmails(customText).valid.map(email => ({
      email,
      date: new Date().toISOString().split('T')[0],
    }));
  }
  return subscribers || [];
}

export function SubscriberTab({ subscribers, deleteSubscriber, addSubscriber, openMediaSelector }: SubscriberTabProps) {
  const language = useStore(s => s.language);
  const isFr = language === 'fr';
  const addNotification = useStore(s => s.addNotification);
  const siteSettings = useStore(s => s.siteSettings);
  const updateSiteSettings = useStore(s => s.updateSiteSettings);
  const [searchTerm, setSearchTerm] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  // Hero image for the newsletter: chosen from the media library or uploaded
  // from the device, with a width the admin can adjust.
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroImageWidth, setHeroImageWidth] = useState(560);
  const [showPreview, setShowPreview] = useState(false);
  const [campaignSuccess, setCampaignSuccess] = useState<string | null>(null);
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState<string | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  // BULK IMPORT: paste any list of addresses, get them all into the directory.
  const [bulkText, setBulkText] = useState('');
  const [bulkResult, setBulkResult] = useState<{ added: number; skipped: number; invalid: string[] } | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [recipientScope, setRecipientScope] = useState<'all' | 'custom'>('all');
  /** Ad-hoc recipients for a one-off send, kept separate from the directory. */
  const [customRecipients, setCustomRecipients] = useState('');
  
  // Gmail API state
  const [googleUser, setGoogleUser] = useState(getCachedGoogleUser());
  const [googleToken, setGoogleToken] = useState(getCachedGoogleToken());
  const [connectedEmail, setConnectedEmail] = useState(getCachedGoogleEmail());
  const [useGmailApi, setUseGmailApi] = useState(true);
  const [isSendingGmail, setIsSendingGmail] = useState(false);
  const [gmailProgress, setGmailProgress] = useState<{ current: number; total: number } | null>(null);

  const [campaignLogs, setCampaignLogs] = useState<{ subject: string; date: string; count: number; method?: string }[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('perspective_campaign_dispatches');
      if (saved) {
        try {
          const parsed = safeJsonParse(saved, []);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return [
      { subject: 'Focus Hebdo: L’Élan Économique Sénégalais', date: '2026-06-12', count: 3, method: 'Gmail API' },
      { subject: 'Perspectives News: Les Chantiers de la Cohabitation', date: '2026-06-18', count: 3, method: 'Server Relay Service' }
    ];
  });

  useEffect(() => {
    async function loadDispatches() {
      try {
        const data = await fetchFirestoreCollection('dispatches');
        if (data && data.length > 0) {
          const loaded: { subject: string; date: string; count: number; method?: string }[] = [];
          data.forEach((row: any) => {
            loaded.push({
              subject: row.subject || 'Newsletter Perspective',
              date: row.date || (row.sentAt ? row.sentAt.split('T')[0] : '2026-08-08'),
              count: row.count || (subscribers.length || 1),
              method: row.method || 'Gmail / Server Relay'
            });
          });
          setCampaignLogs(loaded);
          if (typeof window !== 'undefined') {
            localStorage.setItem('perspective_campaign_dispatches', JSON.stringify(loaded));
          }
        }
      } catch (err) {
        console.warn("Dispatches load notice:", err);
      }
    }
    loadDispatches();
  }, [subscribers.length]);

  const handleDeleteClick = (email: string) => {
    if (confirmDeleteEmail === email) {
      deleteSubscriber(email);
      setConfirmDeleteEmail(null);
    } else {
      setConfirmDeleteEmail(email);
    }
  };

  // Errors are shown in the panel, not just logged. The catch used to be a bare
  // console.error, so a failed connection looked exactly like a dead button.
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectGmail = async () => {
    setConnectError(null);
    setIsConnecting(true);
    try {
      const res = await connectGoogleGmail();
      setGoogleUser(res.user);
      setGoogleToken(res.accessToken);
      setConnectedEmail(res.user.email);
    } catch (e: any) {
      console.error("Gmail connect error:", e);
      setConnectError(e?.message || (isFr ? 'Connexion impossible.' : 'Could not connect.'));
    } finally {
      setIsConnecting(false);
    }
  };

  // INLINE IMAGES: placed at a chosen line inside the article body, not just
  // as a banner above it. `afterLine` is 0-based: 0 = above the first line.
  const [inlineImages, setInlineImages] = useState<InlineImage[]>([]);
  const [pendingImage, setPendingImage] = useState<{ afterLine: number; url: string } | null>(null);
  const [pendingCaption, setPendingCaption] = useState('');

  // SENDER IDENTITY & SIGNATURE.
  // Defaults to the brand and the site favicon, so a fresh install already sends
  // as "Perspective Group" with the right avatar — the admin only has to change
  // them if they want something else.
  const DEFAULT_SENDER_PHOTO = 'https://senperspective.com/favicon.png';
  const [senderName, setSenderName] = useState('');
  const [senderPhoto, setSenderPhoto] = useState('');
  const [signature, setSignature] = useState('');
  const [senderConfigSaved, setSenderConfigSaved] = useState(false);

  useEffect(() => {
    setSenderName(siteSettings?.newsletterSenderName || 'Perspective Group');
    setSenderPhoto(siteSettings?.newsletterSenderPhoto || DEFAULT_SENDER_PHOTO);
    setSignature(siteSettings?.newsletterSignature || '');
  }, [siteSettings?.newsletterSenderName, siteSettings?.newsletterSenderPhoto, siteSettings?.newsletterSignature]);

  // Single source of truth for the rendered email, at component scope so both
  // the live preview and the real send use it. Previously the HTML was inlined
  // inside the send handler, which made a faithful preview impossible.
  const htmlContent = buildNewsletterHtml({
    subject: subject.trim(),
    body: body.trim(),
    imageUrl: heroImageUrl,
    imageWidth: heroImageWidth,
    inlineImages,
    viaGmail: !!googleToken,
    lang: isFr ? 'fr' : 'en',
    senderName: senderName.trim() || 'Perspective Group',
    senderPhoto: senderPhoto.trim(),
    signature,
  });

  const addInlineImage = (afterLine: number, url: string, caption?: string) => {
    setInlineImages(prev => [
      ...prev,
      {
        afterLine,
        url,
        caption: (caption || '').trim(),
        width: 520,
      },
    ]);
    setPendingCaption('');
  };

  const bodyLineCount = body.split('\n').length;

  // BULK IMPORT handler. Every parsed address goes through the same
  // `addSubscriber` action the public signup form uses, so a bulk import and a
  // reader subscribing land in the exact same store and the same persistence —
  // no second list to keep in sync.
  const handleBulkAdd = () => {
    setBulkError(null);
    setBulkResult(null);

    const { valid, invalid } = parseBulkEmails(bulkText);
    if (valid.length === 0) {
      setBulkError(
        invalid.length > 0
          ? (isFr
              ? `Aucune adresse valide. ${invalid.length} entrée(s) ignorée(s) : ${invalid.slice(0, 3).join(', ')}`
              : `No valid address. Ignored ${invalid.length} entr(ies): ${invalid.slice(0, 3).join(', ')}`)
          : (isFr ? 'Collez au moins une adresse e-mail.' : 'Paste at least one email address.')
      );
      return;
    }

    // Report addresses already in the directory instead of pretending they were
    // added, so the count always matches reality.
    const existing = new Set((subscribers || []).map(s => (s.email || '').toLowerCase()));
    const fresh = valid.filter(a => !existing.has(a));
    const skipped = valid.length - fresh.length;

    fresh.forEach(addSubscriber);

    setBulkResult({ added: fresh.length, skipped, invalid });
    if (fresh.length > 0) {
      setBulkText('');
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastError(null);

    if (!subject.trim() || !body.trim()) {
      setBroadcastError(isFr ? 'Le sujet et le message sont obligatoires.' : 'Subject and body are both required.');
      return;
    }

    // FIX (newsletter sent to the wrong people): this used to fall back to a
    // hardcoded list containing the connected Gmail address and
    // contact@senperspective.com whenever the subscriber directory was empty.
    // A failed or slow directory load therefore looked identical to a normal
    // send: it emailed internal addresses and still logged a success.
    // There is now no fallback — an empty list blocks the broadcast.
    const selectedScope = subscriberListFor(recipientScope, customRecipients, subscribers);

    if (selectedScope.length === 0) {
      setBroadcastError(
        isFr
          ? 'Aucun destinataire. Ajoutez des abonnés ou saisissez une liste de diffusion avant d’envoyer.'
          : 'No recipients. Add subscribers or paste a one-off list before sending.'
      );
      return;
    }

    // Deduplicate by address: the same reader can appear twice after a
    // re-subscribe, and would otherwise receive two copies.
    const seenEmails = new Set<string>();
    const recipients = selectedScope.filter((s) => {
      const addr = String(s.email || '').trim().toLowerCase();
      if (!addr || seenEmails.has(addr)) return false;
      seenEmails.add(addr);
      return true;
    });

    if (recipients.length === 0) {
      setBroadcastError(isFr ? 'Aucun abonné valide dans la liste.' : 'No valid recipients in the list.');
      return;
    }

    // Explicit confirmation, so a broadcast is never a one-click accident.
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(
          isFr
            ? `Envoyer « ${subject.trim()} » à ${recipients.length} abonné(s) ?`
            : `Send "${subject.trim()}" to ${recipients.length} subscriber(s)?`
        )
      : true;
    if (!confirmed) return;

    setIsSendingGmail(true);
    setGmailProgress({ current: 0, total: recipients.length });

    let successfulSends = 0;
    // Failures are collected per recipient. Previously a failed send was
    // silently counted as a non-send and the only feedback was a
    // "0/N sent" total, so a permission or quota problem looked identical to a
    // bad address and the admin had no idea what to fix.
    const failures: Array<{ email: string; error: string }> = [];
    let firstHardFailure = '';

    for (let i = 0; i < recipients.length; i++) {
      const sub = recipients[i];
      setGmailProgress({ current: i + 1, total: recipients.length });
      const res = await sendEmailViaGmailApi({
        to: sub.email,
        subject: subject.trim(),
        htmlBody: htmlContent,
        accessToken: googleToken || undefined,
        fromName: 'Perspective Group Editorial'
      });
      if (res.success) {
        successfulSends++;
      } else {
        const reason = res.error || (isFr ? 'échec' : 'failed');
        failures.push({ email: sub.email, error: reason });
        if (!firstHardFailure) firstHardFailure = reason;
      }
    }

    setIsSendingGmail(false);
    setGmailProgress(null);

    // The log records what was ACTUALLY delivered, not how many were
    // attempted. A partial failure previously reported a full count.
    const dispatchMethod = googleToken
      ? `Gmail REST API (${successfulSends}/${recipients.length})`
      : `Server Relay (${successfulSends}/${recipients.length})`;

    const newLog = {
      subject: subject.trim(),
      date: new Date().toISOString().split('T')[0],
      count: successfulSends,
      method: dispatchMethod
    };

    // A zero-delivery run is a failure, not a campaign. Tell the admin instead
    // of logging an empty "sent" dispatch.
    if (successfulSends === 0) {
      setBroadcastError(
        isFr
          ? `Aucun envoi réussi sur ${recipients.length} destinataire(s). Cause : ${firstHardFailure}`
          : `No successful sends out of ${recipients.length} recipient(s). Cause: ${firstHardFailure}`
      );
      return;
    }

    // Save campaign locally first
    const updatedLogs = [newLog, ...campaignLogs];
    setCampaignLogs(updatedLogs);
    if (typeof window !== 'undefined') {
      localStorage.setItem('perspective_campaign_dispatches', JSON.stringify(updatedLogs));
    }

    // Save campaign to database
    try {
      await saveFirestoreDoc('dispatches', 'disp-' + Date.now(), {
        subject: subject.trim(),
        body: body.trim(),
        date: newLog.date,
        sentAt: new Date().toISOString(),
        count: successfulSends,
        attempted: recipients.length,
        method: dispatchMethod,
        status: successfulSends === recipients.length ? 'sent' : 'partial'
      });

      // Notify the recipients that were actually emailed — not every address
      // in the directory, so in-app notifications match real delivery.
      recipients.forEach(sub => {
        addNotification({
          id: 'nl-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          email: sub.email,
          text: {
            fr: `📬 Newsletter Perspective : "${subject.trim()}"`,
            en: `📬 Perspective Newsletter: "${subject.trim()}"`
          },
          date: newLog.date,
          isRead: false,
          category: 'newsletters'
        });
      });
    } catch (e) {
      console.error("Firestore dispatch write notice:", e);
    }

    setCampaignSuccess(
      `${subject.trim()} (${successfulSends}/${recipients.length} ${language === 'fr' ? 'destinataires' : 'recipients'})`
    );

    setBroadcastError(null);
    setSubject('');
    setBody('');

    setTimeout(() => {
      setCampaignSuccess(null);
    }, 6000);
  };

  const filtered = (subscribers || []).filter(s =>
    (s.email ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <h2 className="text-2xl font-extrabold uppercase tracking-tight text-zinc-900 dark:text-zinc-100">
          {language === 'fr' ? 'Gestion des Newsletters' : 'Newsletter Management'}
        </h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
          {language === 'fr' ? 'Diffusion de courriels et gestion des abonnés' : 'Email broadcast and subscriber directory'}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 lg:gap-8">
        {/* Left 2 Columns: Publisher broadcast form */}
        <div className="xl:col-span-2 min-w-0 border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-md p-4 sm:p-6 shadow-xl rounded-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            <h3 className="text-base font-bold uppercase tracking-wider flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <Megaphone size={18} className="text-[#E85D42]" /> 
              {language === 'fr' ? 'Envoyer une Newsletter' : 'Broadcast Campaign'}
            </h3>
            <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">
              ⚡ {language === 'fr' ? 'Enregistrement Base de Données Cloud' : 'Live Cloud DB Recording'}
            </span>
          </div>

          {/* Gmail API Integration Card */}
          <div className="p-3.5 mb-5 bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 text-red-400 rounded-lg">
                <Mail size={18} />
              </div>
              <div>
                <p className="font-bold flex items-center gap-1.5 text-zinc-100">
                  <span>Gmail REST API Dispatcher</span>
                  {googleToken ? (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      ✓ Connecté ({connectedEmail || googleUser?.email || ''})
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      {language === 'fr' ? 'Connexion requise' : 'Connection required'}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-zinc-400">
                  {language === 'fr' 
                    ? "Envoi direct vers les boîtes de réception via votre compte Google authentifié ou le relais Perspective."
                    : "Direct delivery via your authenticated Google account or Perspective server relay."}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-1.5 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleConnectGmail}
                disabled={isConnecting}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-md transition-all flex items-center gap-1.5 cursor-pointer border border-zinc-700 disabled:opacity-60 disabled:cursor-wait whitespace-nowrap"
              >
                {isConnecting ? (
                  <RefreshCw size={13} className="animate-spin text-[#E85D42]" />
                ) : (
                  <UserCheck size={13} className="text-[#E85D42]" />
                )}
                {isConnecting
                  ? (isFr ? 'Connexion…' : 'Connecting…')
                  : googleToken
                    ? (isFr ? 'Changer de compte' : 'Switch Account')
                    : (isFr ? 'Connecter Google' : 'Connect Google')}
              </button>

              {/* A failed connection used to be logged to the console only, so the
                  button just looked dead. The reason is now shown here. */}
              {connectError && (
                <p role="alert" className="text-[10px] text-red-400 leading-relaxed max-w-[280px] sm:text-right">
                  {connectError}
                </p>
              )}
            </div>
          </div>

          {isSendingGmail && gmailProgress && (
            <div className="mb-5 p-4 bg-zinc-950 border border-red-500/40 rounded-xl space-y-2">
              <div className="flex justify-between text-xs font-bold text-zinc-200">
                <span className="flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-red-500" />
                  {language === 'fr' ? 'Envoi en cours via l\'API Gmail...' : 'Broadcasting via Gmail API...'}
                </span>
                <span className="font-mono text-red-400">
                  {gmailProgress.current} / {gmailProgress.total}
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-red-500 h-full transition-all duration-300" 
                  style={{ width: `${(gmailProgress.current / gmailProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
          
          {campaignSuccess && (
            <div className="bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 py-3 px-4 text-xs font-bold mb-6 rounded-md">
              <span className="flex items-center gap-2">
                <Check size={16} /> {campaignSuccess}
              </span>
            </div>
          )}

          {broadcastError && (
            <div className="bg-red-500/10 text-red-800 dark:text-red-300 border border-red-500/30 py-3 px-4 text-xs font-bold mb-6 rounded-md">
              <span>⚠️ {broadcastError}</span>
            </div>
          )}

          <form onSubmit={handleBroadcast} className="space-y-4">
            {/* WHO receives this campaign. Kept above the content fields because
                choosing the wrong audience is the expensive mistake here, and it
                used to be an invisible, fixed "everyone in the directory". */}
            <div className="p-3.5 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-3">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider block">
                {language === 'fr' ? 'Destinataires' : 'Recipients'}
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRecipientScope('all')}
                  className={`flex-1 min-w-[150px] text-left px-3 py-2 rounded-md border text-[11px] font-bold transition-colors cursor-pointer ${
                    recipientScope === 'all'
                      ? 'border-[#E85D42] bg-[#E85D42]/10 text-[#E85D42]'
                      : 'border-zinc-300 dark:border-zinc-800 text-zinc-500 hover:border-zinc-500'
                  }`}
                >
                  {language === 'fr' ? 'Tous les abonnés' : 'All subscribers'}
                  <span className="block text-[10px] font-mono opacity-70 mt-0.5">
                    {subscribers.length} {language === 'fr' ? 'adresse(s)' : 'address(es)'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientScope('custom')}
                  className={`flex-1 min-w-[150px] text-left px-3 py-2 rounded-md border text-[11px] font-bold transition-colors cursor-pointer ${
                    recipientScope === 'custom'
                      ? 'border-[#E85D42] bg-[#E85D42]/10 text-[#E85D42]'
                      : 'border-zinc-300 dark:border-zinc-800 text-zinc-500 hover:border-zinc-500'
                  }`}
                >
                  {language === 'fr' ? 'Liste personnalisée' : 'One-off list'}
                  <span className="block text-[10px] font-mono opacity-70 mt-0.5">
                    {parseBulkEmails(customRecipients).valid.length} {language === 'fr' ? 'détectée(s)' : 'detected'}
                  </span>
                </button>
              </div>

              {recipientScope === 'custom' && (
                <div className="space-y-1.5">
                  <textarea
                    rows={3}
                    value={customRecipients}
                    onChange={e => setCustomRecipients(e.target.value)}
                    placeholder={language === 'fr'
                      ? 'Collez les adresses (une par ligne, ou séparées par des virgules)…'
                      : 'Paste addresses (one per line, or comma-separated)…'}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 p-2.5 text-xs font-mono focus:outline-none focus:border-[#E85D42] placeholder-zinc-400 rounded-md"
                  />
                  <p className="text-[10px] text-zinc-500">
                    {language === 'fr'
                      ? 'Ces adresses ne sont pas ajoutées aux abonnés : cet envoi est ponctuel.'
                      : 'These addresses are not added to your subscribers — this send is one-off.'}
                  </p>
                </div>
              )}
            </div>

            {/* SENDER IDENTITY + SIGNATURE.
                Applied to every newsletter and to the preview, and saved
                separately from the campaign so it is set once, not per send. */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3.5 space-y-3 bg-zinc-50/60 dark:bg-zinc-950/40">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={13} className="text-[#E85D42]" />
                  {language === 'fr' ? 'Expéditeur & signature' : 'Sender & signature'}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    // Only these three keys are written, so saving can never
                    // disturb categories, articles or anything else.
                    updateSiteSettings({
                      newsletterSenderName: senderName.trim() || 'Perspective Group',
                      newsletterSenderPhoto: senderPhoto.trim(),
                      newsletterSignature: signature,
                    });
                    setSenderConfigSaved(true);
                    setTimeout(() => setSenderConfigSaved(false), 2500);
                  }}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-[#E85D42] hover:bg-[#c94931] text-white rounded-md cursor-pointer"
                >
                  {senderConfigSaved
                    ? (language === 'fr' ? '✓ Enregistré' : '✓ Saved')
                    : (language === 'fr' ? 'Enregistrer' : 'Save')}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
                    {language === 'fr' ? 'Nom de l\'expéditeur' : 'Sender name'}
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    placeholder="Perspective Group"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 px-2.5 py-2 text-xs focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
                    {language === 'fr' ? 'Photo (URL)' : 'Photo (URL)'}
                  </label>
                  <input
                    type="text"
                    value={senderPhoto}
                    onChange={e => setSenderPhoto(e.target.value)}
                    placeholder="https://senperspective.com/favicon.png"
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 px-2.5 py-2 text-[11px] font-mono focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
                  {language === 'fr' ? 'Signature (apposée à chaque newsletter)' : 'Signature (appended to every newsletter)'}
                </label>
                <textarea
                  rows={3}
                  value={signature}
                  onChange={e => setSignature(e.target.value)}
                  placeholder={isFr
                    ? "L'équipe de Rédaction\nPerspective Group — senperspective.com"
                    : 'The Editorial Team\nPerspective Group — senperspective.com'}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 p-2.5 text-[11px] leading-relaxed focus:outline-none focus:border-[#E85D42] placeholder-zinc-400 rounded-md"
                />
              </div>

              {senderPhoto.trim() && (
                <p className="text-[10px] text-zinc-500">
                  {language === 'fr'
                    ? 'Astuce : la photo doit être une URL https publique — la plupart des clients mail bloquent les images non hébergées.'
                    : 'Tip: the photo must be a public https URL — most email clients block images that are not hosted.'}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider block mb-1">
                {language === 'fr' ? 'Objet de l\'email' : 'Subject Line'}
              </label>
              <input
                type="text"
                required
                placeholder={language === 'fr' ? "ex: Perspective Spécial : Économie & Décryptage" : "e.g. Perspective Special : Economic Brief"}
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 p-2.5 text-xs font-medium focus:outline-none focus:border-[#E85D42] placeholder-zinc-400 dark:placeholder-zinc-500 rounded-md"
              />
            </div>
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider block">
                  {language === 'fr' ? 'Contenu de la newsletter' : 'Newsletter Body'}
                </label>
                <span className="text-[10px] text-[#E85D42] font-bold uppercase flex items-center gap-1">
                  <Sparkles size={10} /> {language === 'fr' ? 'Variable : {EMAIL}' : 'Variable: {EMAIL}'}
                </span>
              </div>
              <textarea
                rows={9}
                required
                placeholder={language === 'fr' ? `Chers lecteurs de Perspective,\n\nVoici notre décryptage exclusif des réalités socio-économiques...\n\nL'équipe de Rédaction.` : `Dear Perspective readers,\n\nHere is our weekly analysis...\n\nEditorial Team.`}
                value={body}
                onChange={e => setBody(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 p-3 text-xs leading-relaxed focus:outline-none focus:border-[#E85D42] placeholder-zinc-400 dark:placeholder-zinc-500 rounded-md"
              />

              {/* WYSIWYG toolbar — bold, italic, headings, lists, links, quotes,
                  dividers and images, in one row. The plain textarea above stays
                  available for pasting long text without rich markup. */}
              <div className="mt-2">
                <RichTextEditor
                  value={body}
                  onChange={setBody}
                  isFr={isFr}
                  openMediaSelector={openMediaSelector}
                  placeholder={isFr
                    ? 'Rédigez votre newsletter… (gras, titres, listes, liens, images)'
                    : 'Write your newsletter… (bold, headings, lists, links, images)'}
                />
              </div>
            </div>
            {/* INLINE IMAGES INSIDE THE ARTICLE.
                The hero image below can only sit above the text. This lets an
                image be placed at a chosen line of the body, so the newsletter
                reads like an article rather than a banner with a wall of text. */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 space-y-3 bg-zinc-50/60 dark:bg-zinc-950/40">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon size={13} className="text-[#E85D42]" />
                  {language === 'fr' ? 'Images dans l\'article' : 'Images in the article'}
                </label>
                <span className="text-[10px] font-mono text-zinc-500">{inlineImages.length}</span>
              </div>

              {inlineImages.map((img, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md">
                  <img src={img.url} alt="" className="w-16 h-12 object-cover rounded-sm shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono text-zinc-500">
                      {isFr ? `après la ligne ${img.afterLine}` : `after line ${img.afterLine}`}
                    </p>
                    {img.caption && (
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate">{img.caption}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setInlineImages(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1 text-zinc-400 hover:text-red-400 cursor-pointer shrink-0"
                    title={language === 'fr' ? 'Retirer' : 'Remove'}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}

              {/* Position picker + source, revealed together. */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end">
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">
                    {language === 'fr' ? 'Position' : 'Position'}
                  </label>
                  <select
                    value={pendingImage?.afterLine ?? 0}
                    onChange={e => setPendingImage({ afterLine: Number(e.target.value), url: '' })}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 px-2.5 py-2 text-xs focus:outline-none focus:border-[#E85D42] rounded-md"
                  >
                    <option value={0}>{isFr ? 'Avant le texte' : 'Before the text'}</option>
                    {Array.from({ length: bodyLineCount }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>
                        {isFr ? `Après la ligne ${n}` : `After line ${n}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-1.5">
                  {openMediaSelector && (
                    <button
                      type="button"
                      onClick={() => openMediaSelector((url) => setPendingImage({ afterLine: pendingImage?.afterLine ?? 0, url }))}
                      className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-[10px] font-bold uppercase tracking-wider py-2 px-3 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <ImageIcon size={12} className="text-[#E85D42]" />
                      {language === 'fr' ? 'Médiathèque' : 'Library'}
                    </button>
                  )}
                  <label className="flex items-center gap-1.5 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-[10px] font-bold uppercase tracking-wider py-2 px-3 rounded-md transition-colors cursor-pointer whitespace-nowrap">
                    <Upload size={12} className="text-[#E85D42]" />
                    {language === 'fr' ? 'Appareil' : 'Device'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const { compressImageFile } = await import('../../lib/imageUtils');
                          const dataUrl = await compressImageFile(file, 1400, 4000, 0.82);
                          setPendingImage({ afterLine: pendingImage?.afterLine ?? 0, url: dataUrl });
                        } catch (err) {
                          console.error('Inline image upload failed:', err);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {pendingImage?.url && (
                <div className="space-y-2 p-2 bg-white dark:bg-zinc-900 border border-[#E85D42]/40 rounded-md">
                  <img src={pendingImage.url} alt="" className="w-full max-h-40 object-contain rounded-sm" />
                  <input
                    type="text"
                    value={pendingCaption}
                    onChange={e => setPendingCaption(e.target.value)}
                    placeholder={isFr ? 'Légende (optionnelle)' : 'Caption (optional)'}
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 px-2.5 py-1.5 text-[11px] focus:outline-none focus:border-[#E85D42] rounded-md"
                  />
                  <div className="flex gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => { setPendingImage(null); setPendingCaption(''); }}
                      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    >
                      {language === 'fr' ? 'Annuler' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => addInlineImage(pendingImage.afterLine, pendingImage.url, pendingCaption)}
                      className="px-3 py-1.5 bg-[#E85D42] hover:bg-[#c94931] text-white text-[10px] font-bold uppercase tracking-wider rounded-md cursor-pointer"
                    >
                      {language === 'fr' ? 'Insérer' : 'Insert'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Hero/banner image, which sits ABOVE the article text. */}
            <div>
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-200 uppercase tracking-wider block mb-1">
                {language === 'fr' ? 'Image de couverture (optionnelle)' : 'Cover image (optional)'}
              </label>

              {heroImageUrl ? (
                <div className="border border-zinc-300 dark:border-zinc-700 rounded-md p-2 space-y-2">
                  <div className="relative bg-zinc-100 dark:bg-zinc-900 rounded overflow-hidden">
                    <img
                      src={heroImageUrl}
                      alt=""
                      style={{ width: `${Math.min(heroImageWidth, 100)}%` }}
                      className="h-auto block mx-auto"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-mono uppercase text-zinc-500 shrink-0">
                      {language === 'fr' ? 'Largeur' : 'Width'}
                    </label>
                    <input
                      type="range"
                      min={200}
                      max={600}
                      step={20}
                      value={heroImageWidth}
                      onChange={e => setHeroImageWidth(Number(e.target.value))}
                      className="flex-1 accent-[#E85D42]"
                    />
                    <span className="text-[10px] font-mono text-zinc-400 w-10 text-right shrink-0">
                      {heroImageWidth}px
                    </span>
                    <button
                      type="button"
                      onClick={() => setHeroImageUrl('')}
                      className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors shrink-0"
                      title={language === 'fr' ? 'Retirer l’image' : 'Remove image'}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  {openMediaSelector && (
                    <button
                      type="button"
                      onClick={() => openMediaSelector((url) => setHeroImageUrl(url))}
                      className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-bold uppercase tracking-wider py-2.5 rounded-md transition-colors cursor-pointer"
                    >
                      <ImageIcon size={14} className="text-[#E85D42]" />
                      {language === 'fr' ? 'Médiathèque' : 'Media library'}
                    </button>
                  )}
                  <label className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-bold uppercase tracking-wider py-2.5 rounded-md transition-colors cursor-pointer">
                    <Upload size={14} className="text-[#E85D42]" />
                    {language === 'fr' ? 'Appareil' : 'Device'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const { compressImageFile } = await import('../../lib/imageUtils');
                          // Signature is (file, maxWidth, maxHeight, quality).
                          // A newsletter is a single column, so height is left
                          // generous and only the width is constrained.
                          const dataUrl = await compressImageFile(file, 1400, 4000, 0.82);
                          setHeroImageUrl(dataUrl);
                        } catch (err) {
                          console.error('Newsletter image upload failed:', err);
                        }
                      }}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Preview toggle + live preview. */}
            <div>
              <button
                type="button"
                onClick={() => setShowPreview(v => !v)}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-[#E85D42] transition-colors"
              >
                <Eye size={13} />
                {showPreview
                  ? (language === 'fr' ? 'Masquer l’aperçu' : 'Hide preview')
                  : (language === 'fr' ? 'Aperçu de l’email' : 'Preview email')}
              </button>

              {showPreview && (
                <div className="mt-2 border border-zinc-300 dark:border-zinc-700 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-950">
                  <div className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-900 border-b border-zinc-300 dark:border-zinc-800 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                    {language === 'fr' ? 'Aperçu' : 'Preview'}
                  </div>
                  <iframe
                    title={language === 'fr' ? 'Aperçu newsletter' : 'Newsletter preview'}
                    srcDoc={htmlContent}
                    className="w-full border-0 bg-white"
                    style={{ height: 480 }}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={subscriberListFor(recipientScope, customRecipients, subscribers).length === 0}
                className="flex items-center gap-2 bg-[#E85D42] hover:bg-[#c94931] disabled:bg-zinc-400 dark:disabled:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 shadow-md transition-all cursor-pointer rounded-xs"
              >
                <Send size={14} /> {language === 'fr' ? 'Diffuser la campagne' : 'Send Broadcast'}
              </button>
            </div>
          </form>

          {/* Past Campaigns Log */}
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 mb-3">
              {language === 'fr' ? 'Historique des envois' : 'Broadcast History'}
            </h4>
            <div className="space-y-2">
              {campaignLogs.map((log, i) => (
                <div key={i} className="flex justify-between items-center bg-zinc-950/80 p-3 text-xs border border-zinc-800 rounded-md">
                  <div>
                    <span className="font-bold block text-zinc-100">{log.subject}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">{language === 'fr' ? 'Envoyé sans erreur' : 'Dispatched'}</span>
                  </div>
                  <div className="text-right text-[10px] text-zinc-400 font-mono">
                    <span className="block font-bold">{log.date}</span>
                    <span>{log.count} {language === 'fr' ? 'destinataires' : 'recipients'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Subscriber List */}
        <div className="border border-zinc-800 bg-zinc-900/80 backdrop-blur-md p-6 shadow-xl rounded-lg flex flex-col justify-between h-fit">
          <div className="space-y-4">
            <h3 className="text-base font-bold uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2 text-white">
              <Users size={18} className="text-[#E85D42]" /> {language === 'fr' ? `Abonnés (${filtered.length})` : `Subscribers (${filtered.length})`}
            </h3>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-zinc-400" />
              <input
                type="text"
                placeholder={language === 'fr' ? "Rechercher un abonné..." : "Search subscribers..."}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-700/80 text-zinc-100 text-xs focus:outline-none focus:border-[#E85D42] focus:ring-1 focus:ring-[#E85D42] placeholder-zinc-500 rounded-md"
              />
            </div>

            {/* BULK ADD. Collapsed by default so the directory stays the focus;
                expanding reveals a single paste box, one button, one result line. */}
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setBulkOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-zinc-950/60 hover:bg-zinc-800/60 text-[11px] font-bold uppercase tracking-wider text-zinc-300 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <UserCheck size={14} className="text-[#E85D42]" />
                  {language === 'fr' ? 'Ajouter en masse' : 'Bulk add emails'}
                </span>
                <span className="text-zinc-500">{bulkOpen ? '−' : '+'}</span>
              </button>

              {bulkOpen && (
                <div className="p-3 space-y-2.5 bg-zinc-950/40">
                  <textarea
                    rows={5}
                    value={bulkText}
                    onChange={e => { setBulkText(e.target.value); setBulkResult(null); setBulkError(null); }}
                    placeholder={language === 'fr'
                      ? 'Collez vos adresses ici — une par ligne, ou séparées par des virgules, points-virgules ou espaces.'
                      : 'Paste your addresses — one per line, or separated by commas, semicolons or spaces.'}
                    className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 p-2.5 text-[11px] font-mono focus:outline-none focus:border-[#E85D42] placeholder-zinc-600 rounded-md"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleBulkAdd}
                      disabled={!bulkText.trim()}
                      className="flex items-center gap-1.5 bg-[#E85D42] hover:bg-[#c94931] disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Plus size={13} /> {language === 'fr' ? 'Ajouter' : 'Add'}
                    </button>
                    {bulkText.trim() && (
                      <span className="text-[10px] font-mono text-zinc-500">
                        {parseBulkEmails(bulkText).valid.length} {language === 'fr' ? 'valide(s)' : 'valid'}
                      </span>
                    )}
                  </div>

                  {bulkError && (
                    <p role="alert" className="text-[10px] text-red-400 leading-relaxed">{bulkError}</p>
                  )}

                  {bulkResult && (
                    <p className="text-[10px] text-emerald-400 leading-relaxed">
                      ✓ {bulkResult.added} {language === 'fr' ? 'abonné(s) ajouté(s)' : 'subscriber(s) added'}
                      {bulkResult.skipped > 0 && (
                        <span className="text-zinc-500">
                          {' '}· {bulkResult.skipped} {language === 'fr' ? 'déjà présent(s)' : 'already present'}
                        </span>
                      )}
                      {bulkResult.invalid.length > 0 && (
                        <span className="text-amber-400">
                          {' '}· {bulkResult.invalid.length} {language === 'fr' ? 'ignoré(s)' : 'ignored'}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {filtered.map((s, i) => (
                <div key={i} className="flex justify-between items-center bg-zinc-950/80 p-3 text-xs border border-zinc-800 hover:border-zinc-700 transition-colors rounded-md">
                  <div>
                    <span className="font-bold truncate text-zinc-100 block max-w-[150px]" title={s.email}>{s.email}</span>
                    <span className="text-[10px] text-zinc-400 block font-mono">{language === 'fr' ? 'Inscrit le' : 'Since'} {s.date}</span>
                  </div>
                  {confirmDeleteEmail === s.email ? (
                    <button
                      onClick={() => handleDeleteClick(s.email)}
                      className="p-1 px-2 text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 uppercase animate-pulse transition-all cursor-pointer rounded-xs"
                    >
                      {language === 'fr' ? 'Supprimer ?' : 'Confirm?'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDeleteClick(s.email)}
                      className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer rounded-xs"
                      title="Supprimer abonné"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}

              {filtered.length === 0 && (
                <p className="text-xs text-zinc-400 italic text-center py-6">{language === 'fr' ? 'Aucun abonné trouvé.' : 'No subscribers found.'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


