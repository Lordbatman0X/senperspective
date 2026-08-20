import React, { useState } from 'react';
import { useStore } from '../../store';
import { 
  Mail, MessageSquare, Database, BarChart3, CheckCircle2, AlertCircle, 
  Send, ExternalLink, ShieldCheck, Sparkles, RefreshCw, Key, Globe, Lock, UserCheck
} from 'lucide-react';
import { 
  connectGoogleGmail, 
  disconnectGoogleGmail, 
  getCachedGoogleToken, 
  getCachedGoogleUser, 
  getCachedGoogleEmail,
  sendEmailViaGmailApi,
  sendGoogleChatMessage 
} from '../../lib/googleIntegration';

export function GoogleIntegrationsTab() {
  const { language, siteSettings, updateSiteSettings } = useStore();
  const [googleUser, setGoogleUser] = useState(getCachedGoogleUser());
  const [googleToken, setGoogleToken] = useState(getCachedGoogleToken());
  const [connectedEmail, setConnectedEmail] = useState(getCachedGoogleEmail());
  const [isConnecting, setIsConnecting] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState(getCachedGoogleEmail() || 'kadersdiaz3@gmail.com');
  const [testEmailStatus, setTestEmailStatus] = useState<{ type: 'success' | 'error' | 'loading'; msg: string } | null>(null);

  // Google Chat Webhook state
  const [chatWebhookUrl, setChatWebhookUrl] = useState(siteSettings?.googleChatWebhook || '');
  const [chatStatus, setChatStatus] = useState<string | null>(null);

  // GA4 Measurement ID
  const [ga4MeasurementId, setGa4MeasurementId] = useState(siteSettings?.ga4MeasurementId || 'G-[#PERSP-2026]');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cloud SQL config info
  const cloudSqlRegion = "europe-west2";
  const cloudSqlInstance = "perspective-db-pg";

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    try {
      const res = await connectGoogleGmail();
      setGoogleUser(res.user);
      setGoogleToken(res.accessToken);
      setConnectedEmail(res.user.email);
      if (res.user.email) setTestEmailRecipient(res.user.email);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectGmail = async () => {
    await disconnectGoogleGmail();
    setGoogleUser(null);
    setGoogleToken(null);
    setConnectedEmail(null);
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = testEmailRecipient.trim() || 'kadersdiaz3@gmail.com';

    setTestEmailStatus({ 
      type: 'loading', 
      msg: language === 'fr' ? `Envoi du courriel de test à ${targetEmail}...` : `Sending test email to ${targetEmail}...` 
    });

    const result = await sendEmailViaGmailApi({
      to: targetEmail,
      subject: language === 'fr' ? 'Test d\'intégration Gmail - Perspective Group' : 'Gmail API Test - Perspective Group',
      htmlBody: `
        <div style="font-family: sans-serif; padding: 24px; color: #18181b; background-color: #f4f4f5; border-radius: 8px; border: 1px solid #e4e4e7;">
          <h2 style="color: #E85D42; margin-top: 0; text-transform: uppercase; font-size: 20px;">Perspective Group</h2>
          <p style="font-size: 14px; font-weight: bold; color: #16a34a;">
            ${language === 'fr' ? '✓ Test d\'envoi d\'e-mail réussi !' : '✓ Email Dispatch Test Succeeded!'}
          </p>
          <p style="font-size: 13px; line-height: 1.6; color: #3f3f46;">
            ${language === 'fr' 
              ? 'Votre infrastructure de messagerie Perspective Group est pleinement opérationnelle. Les newsletters, alertes éditoriales et courriels automatisés seront acheminés avec succès.' 
              : 'Your Perspective Group email infrastructure is fully operational. Newsletters, editorial alerts, and automated emails will be delivered cleanly.'}
          </p>
          <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 16px 0;" />
          <p style="font-size: 11px; color: #71717a;">
            Recipient: ${targetEmail} • Dispatched via ${googleToken ? 'Gmail REST API (OAuth 2.0)' : 'Perspective Relay Service'}
          </p>
        </div>
      `,
      accessToken: googleToken || undefined
    });

    if (result.success) {
      setTestEmailStatus({ 
        type: 'success', 
        msg: language === 'fr' 
          ? `✓ E-mail envoyé avec succès à ${targetEmail} ! (ID: ${result.id})` 
          : `✓ Email dispatched successfully to ${targetEmail}! (ID: ${result.id})` 
      });
    } else {
      setTestEmailStatus({ 
        type: 'error', 
        msg: result.error || (language === 'fr' ? 'Échec de l\'envoi' : 'Dispatch failed') 
      });
    }
  };

  const handleTestGoogleChat = async () => {
    if (!chatWebhookUrl) return;
    setChatStatus(language === 'fr' ? 'Envoi de l\'alerte test...' : 'Sending test alert...');
    const ok = await sendGoogleChatMessage(
      chatWebhookUrl,
      `🔔 *[Perspective Group Editorial Bot]*\nTest d'intégration Google Chat réussi! Les alertes de modération et nouveaux messages seront acheminés ici.`
    );
    if (ok) {
      setChatStatus(language === 'fr' ? '✓ Message envoyé dans l\'espace Google Chat !' : '✓ Message sent to Google Chat space!');
    } else {
      setChatStatus(language === 'fr' ? '⚠️ URL Webhook invalide ou bloquée.' : '⚠️ Webhook URL invalid or blocked.');
    }
  };

  const handleSaveSettings = () => {
    updateSiteSettings({
      googleChatWebhook: chatWebhookUrl,
      ga4MeasurementId
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold uppercase tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Globe className="text-[#E85D42]" size={24} />
            {language === 'fr' ? 'Intégations Google Ecosystem' : 'Google Ecosystem Hub'}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-1">
            {language === 'fr' 
              ? 'Gmail API, Google Chat, Cloud SQL PostgreSQL et Traffic Analytics GA4' 
              : 'Gmail API, Google Chat, Cloud SQL PostgreSQL & GA4 Traffic Analytics'}
          </p>
        </div>
        
        {saveSuccess && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            {language === 'fr' ? 'Paramètres Google sauvegardés' : 'Google settings saved'}
          </div>
        )}
      </div>

      {/* Grid of 4 Google Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. GMAIL API FOR NEWSLETTERS */}
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-6 rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 text-red-500 rounded-lg">
                  <Mail size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Gmail API Newsletter
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    {language === 'fr' ? 'Diffusion de courriels authentifiés' : 'Authenticated Email Dispatch'}
                  </span>
                </div>
              </div>

              {googleToken ? (
                <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono rounded-full flex items-center gap-1">
                  <CheckCircle2 size={12} /> {language === 'fr' ? 'Connecté' : 'Connected'}
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold font-mono rounded-full flex items-center gap-1">
                  <AlertCircle size={12} /> {language === 'fr' ? 'Non connecté' : 'Disconnected'}
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4">
              {language === 'fr'
                ? 'Connectez l\'adresse Gmail de la rédaction pour diffuser les newsletters directement via l\'infrastructure de messagerie officielle Google.'
                : 'Connect the editorial team\'s Gmail account to dispatch newsletters directly via Google\'s official API infrastructure.'}
            </p>

            {connectedEmail || googleToken ? (
              <div className="p-3.5 bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2 mb-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-mono">{language === 'fr' ? 'Compte Google :' : 'Google Account:'}</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">{connectedEmail || googleUser?.email || 'kadersdiaz3@gmail.com'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 font-mono">{language === 'fr' ? 'Portée API :' : 'API Scope:'}</span>
                  <span className="text-[11px] font-mono text-emerald-400">gmail.send + gmail.compose + spreadsheets</span>
                </div>
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleConnectGmail}
                    disabled={isConnecting}
                    className="text-[10px] font-mono font-bold text-[#E85D42] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <UserCheck size={11} /> {language === 'fr' ? 'Changer de compte Google' : 'Switch Google Account'}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Test Email Form - Always Available */}
            <form onSubmit={handleSendTestEmail} className="mt-2 space-y-3 p-3 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-lg">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block">
                  {language === 'fr' ? 'Tester l\'envoi d\'un e-mail (Gmail REST / Serveur)' : 'Test Email Dispatch (Gmail REST / Server Relay)'}
                </label>
                <span className="text-[9px] font-mono text-zinc-500">
                  {googleToken ? (language === 'fr' ? 'OAuth Actif' : 'OAuth Active') : (language === 'fr' ? 'Relais Serveur' : 'Server Relay')}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="email@example.com"
                  value={testEmailRecipient}
                  onChange={e => setTestEmailRecipient(e.target.value)}
                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs px-3 py-1.5 rounded text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#E85D42]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#E85D42] hover:bg-[#c94931] text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1 cursor-pointer transition-all"
                >
                  <Send size={12} /> {language === 'fr' ? 'Envoyer Test' : 'Send Test'}
                </button>
              </div>

              {testEmailStatus && (
                <div className={`p-2 rounded text-[11px] font-mono mt-2 border ${
                  testEmailStatus.type === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : testEmailStatus.type === 'error' 
                    ? 'bg-red-500/10 text-red-400 border-red-500/30' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                }`}>
                  {testEmailStatus.msg}
                </div>
              )}
            </form>
          </div>

          <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            {googleToken ? (
              <button
                onClick={handleDisconnectGmail}
                className="text-xs text-red-500 hover:text-red-400 font-bold uppercase tracking-wider cursor-pointer"
              >
                {language === 'fr' ? 'Déconnecter Gmail' : 'Disconnect Gmail'}
              </button>
            ) : (
              <button
                onClick={handleConnectGmail}
                disabled={isConnecting}
                className="gsi-material-button w-full sm:w-auto"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  border: '1px solid #747775',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                  color: '#1f1f1f',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  height: '38px',
                  justifyContent: 'center',
                  padding: '0 12px',
                  transition: 'background-color 0.2s, box-shadow 0.2s'
                }}
              >
                <div style={{ marginRight: '8px', width: '18px', height: '18px' }}>
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                </div>
                <span>{isConnecting ? (language === 'fr' ? 'Connexion...' : 'Connecting...') : (language === 'fr' ? 'Connecter Gmail via Google' : 'Sign in with Google (Gmail)')}</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. GOOGLE CHAT API (MESSAGES & EDITORIAL ALERTS) */}
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-6 rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-lg">
                  <MessageSquare size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Google Chat Webhook
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    {language === 'fr' ? 'Notifications d\'espace de travail' : 'Editorial Space Notifications'}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold font-mono rounded-full">
                Google Workspace
              </span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4">
              {language === 'fr'
                ? 'Acheminez automatiquement les messages internes, commentaires signalés et alertes de modération vers vos espaces de discussion Google Chat.'
                : 'Route internal messages, flagged comments, and moderation alerts directly into your editorial Google Chat spaces.'}
            </p>

            <div className="space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block">
                {language === 'fr' ? 'URL Webhook Google Chat Space :' : 'Google Chat Space Webhook URL:'}
              </label>
              <input
                type="url"
                placeholder="https://chat.googleapis.com/v1/spaces/SPACE_ID/messages?key=..."
                value={chatWebhookUrl}
                onChange={e => setChatWebhookUrl(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs p-2.5 rounded text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-[#E85D42]"
              />

              {chatStatus && (
                <p className="text-[11px] font-mono text-zinc-400 mt-1">
                  {chatStatus}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <button
              type="button"
              onClick={handleTestGoogleChat}
              disabled={!chatWebhookUrl}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer"
            >
              {language === 'fr' ? 'Tester l\'alerte Chat' : 'Test Chat Alert'}
            </button>
            <button
              onClick={handleSaveSettings}
              className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider rounded cursor-pointer"
            >
              {language === 'fr' ? 'Enregistrer' : 'Save'}
            </button>
          </div>
        </div>

        {/* 3. GOOGLE CLOUD SQL POSTGRESQL & BIGQUERY */}
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-6 rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-500/10 text-cyan-500 rounded-lg">
                  <Database size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Google Cloud SQL & BigQuery
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    {language === 'fr' ? 'Base SQL & Entrepôt de données' : 'Relational SQL & Analytics Warehouse'}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold font-mono rounded-full">
                PostgreSQL
              </span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4">
              {language === 'fr'
                ? 'Archivage SQL à grande échelle et requêtes décisionnelles via Google Cloud SQL (PostgreSQL) et Google BigQuery pour le suivi de la rétention des lecteurs.'
                : 'High-scale SQL archiving and business intelligence queries via Google Cloud SQL (PostgreSQL) and Google BigQuery for reader retention analysis.'}
            </p>

            <div className="p-3.5 bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">{language === 'fr' ? 'Instance Cloud SQL :' : 'Cloud SQL Instance:'}</span>
                <span className="text-zinc-900 dark:text-zinc-200 font-bold">{cloudSqlInstance}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">{language === 'fr' ? 'Région Cloud GCP :' : 'GCP Region:'}</span>
                <span className="text-zinc-900 dark:text-zinc-200">{cloudSqlRegion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">{language === 'fr' ? 'Statut Synchronisation :' : 'Sync Status:'}</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} /> {language === 'fr' ? 'Prêt pour export SQL' : 'Ready for SQL export'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <span className="text-[11px] text-zinc-500 font-mono">
              ⚡ Firestore + Cloud SQL Mirroring
            </span>
            <a
              href="https://console.cloud.google.com/sql"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-500 hover:text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1"
            >
              {language === 'fr' ? 'Console Cloud SQL' : 'Cloud SQL Console'} <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* 4. GOOGLE ANALYTICS 4 & SEARCH CONSOLE */}
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-6 rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-lg">
                  <BarChart3 size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                    Google Analytics 4 & SEO
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    {language === 'fr' ? 'Analyse du trafic & Moteur de recherche' : 'Traffic Analytics & Search Console'}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold font-mono rounded-full">
                GA4 / SEO
              </span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4">
              {language === 'fr'
                ? 'Suivez les vues d\'articles en temps réel, l\'origine géographique des lecteurs et l\'indexation Search Console.'
                : 'Monitor real-time article views, geographic reader origin, and Google Search Console indexing performance.'}
            </p>

            <div className="space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 block">
                {language === 'fr' ? 'ID de mesure Google Analytics 4 (GA4) :' : 'GA4 Measurement ID:'}
              </label>
              <input
                type="text"
                placeholder="G-XXXXXXXXXX"
                value={ga4MeasurementId}
                onChange={e => setGa4MeasurementId(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs p-2.5 rounded text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:border-[#E85D42]"
              />
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <span className="text-[11px] text-zinc-500 font-mono">
              Google Analytics tag injecté
            </span>
            <button
              onClick={handleSaveSettings}
              className="px-3.5 py-1.5 bg-[#E85D42] hover:bg-[#c94931] text-white text-xs font-bold uppercase tracking-wider rounded cursor-pointer"
            >
              {language === 'fr' ? 'Mettre à jour' : 'Update GA4'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
