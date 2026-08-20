import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Key, Lock, CheckCircle2, ShieldCheck, User, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, siteSettings, addSubscriber } = useStore();
  const { user: firebaseUser, loginWithEmail, registerWithEmail, resetUserPassword } = useAuth();

  const isNewsletterMode = location.pathname.includes('/newsletter') || location.search.includes('mode=newsletter');

  const [authTab, setAuthTab] = useState<'login' | 'register' | 'newsletter'>(isNewsletterMode ? 'newsletter' : 'login');
  const [authType, setAuthType] = useState<'password' | 'pin'>('password');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // 2FA State
  const [is2FAActive, setIs2FAActive] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [pendingAccount, setPendingAccount] = useState<{ email: string; pass: string; name?: string } | null>(null);

  const accentColor = siteSettings?.accentColor || '#E85D42';

  useEffect(() => {
    if (isNewsletterMode) {
      setAuthTab('newsletter');
    }
  }, [isNewsletterMode]);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage(language === 'fr' ? 'Veuillez saisir une adresse e-mail valide.' : 'Please enter a valid email.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await addSubscriber(email.trim());
      setSuccessMessage(
        language === 'fr'
          ? 'Votre inscription à la newsletter du Club des Lecteurs a été confirmée !'
          : 'Your subscription to the Readers Club newsletter is confirmed!'
      );
      setEmail('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error subscribing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage(language === 'fr' ? 'Adresse e-mail invalide.' : 'Invalid email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (authTab === 'login') {
        const credential = authType === 'password' ? password : pin;
        if (!credential) {
          setErrorMessage(language === 'fr' ? 'Veuillez remplir vos identifiants.' : 'Please fill in your credentials.');
          setIsSubmitting(false);
          return;
        }

        // Trigger 2FA step simulation for security
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedCode(code);
        setPendingAccount({ email, pass: credential });
        setIs2FAActive(true);
        setSuccessMessage(
          language === 'fr'
            ? 'Code de sécurité 2FA généré. Entrez le code ci-dessous.'
            : '2FA security code generated. Enter the code below.'
        );
      } else {
        if (!name.trim()) {
          setErrorMessage(language === 'fr' ? 'Veuillez indiquer votre nom.' : 'Please enter your name.');
          setIsSubmitting(false);
          return;
        }
        const credential = authType === 'password' ? password : pin;
        if (authType === 'password' && credential.length < 6) {
          setErrorMessage(language === 'fr' ? 'Le mot de passe doit contenir au moins 6 caractères.' : 'Password must be at least 6 characters.');
          setIsSubmitting(false);
          return;
        }
        if (authType === 'pin' && !/^\d{4,6}$/.test(pin)) {
          setErrorMessage(language === 'fr' ? 'Le code PIN doit comporter 4 à 6 chiffres.' : 'PIN code must be 4 to 6 digits.');
          setIsSubmitting(false);
          return;
        }

        await registerWithEmail(email.trim(), credential, name.trim(), 'Member', '', authType, pin, true);
        await addSubscriber(email.trim());
        setSuccessMessage(
          language === 'fr'
            ? 'Compte créé avec succès ! Vos abonnements aux newsletters ont été synchronisés.'
            : 'Account successfully created! Your newsletter subscriptions have been synced.'
        );
        setTimeout(() => {
          navigate('/profile/' + encodeURIComponent(email.trim()));
        }, 1200);
      }
    } catch (err: any) {
      console.error('Auth submit error:', err);
      setErrorMessage(err.message || (language === 'fr' ? 'Une erreur est survenue.' : 'An error occurred.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim() !== generatedCode.trim()) {
      setErrorMessage(language === 'fr' ? 'Code 2FA incorrect.' : 'Incorrect 2FA code.');
      return;
    }

    if (!pendingAccount) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await loginWithEmail(pendingAccount.email, pendingAccount.pass);
      setSuccessMessage(language === 'fr' ? 'Connexion réussie !' : 'Authentication successful!');
      setIs2FAActive(false);
      setTimeout(() => {
        navigate('/profile/' + encodeURIComponent(pendingAccount.email));
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email || !email.includes('@')) {
      setErrorMessage(language === 'fr' ? 'Veuillez d’abord renseigner votre e-mail.' : 'Please enter your email address first.');
      return;
    }
    try {
      await resetUserPassword(email);
      setSuccessMessage(language === 'fr' ? 'Un e-mail de réinitialisation a été envoyé.' : 'Password reset email sent.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error resetting password.');
    }
  };

  return (
    <div className="min-h-[85vh] w-full bg-zinc-950 text-zinc-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-xl bg-zinc-900 border-2 border-zinc-800 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        {/* Top Accent Line */}
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-[#E85D42] to-rose-600"
          style={{ backgroundColor: accentColor }}
        />

        {/* Header Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E85D42]/10 border border-[#E85D42]/30 text-[#E85D42] text-[10px] font-mono font-bold uppercase tracking-widest rounded-full mb-3">
            <Sparkles size={12} />
            <span>Perspective Group • Authentification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-tight text-white mb-2">
            {authTab === 'newsletter'
              ? language === 'fr' ? 'Espace Newsletter & Club' : 'Newsletter & Readers Club'
              : authTab === 'login'
              ? language === 'fr' ? 'Espace Authentification' : 'Subscriber Authentication'
              : language === 'fr' ? 'Création de Compte Membre' : 'New Member Registration'}
          </h1>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            {language === 'fr'
              ? 'Accédez à votre espace privé, gérez vos abonnements aux briefs stratégiques et personnalisez vos flux d’informations.'
              : 'Access your private portal, manage your strategic newsletter preferences, and personalize your news dispatches.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 bg-zinc-950 p-1 border border-zinc-800 mb-6 font-mono text-[10px] font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => { setAuthTab('login'); setIs2FAActive(false); setErrorMessage(''); setSuccessMessage(''); }}
            className={`py-2 text-center transition-all cursor-pointer ${
              authTab === 'login' ? 'bg-[#E85D42] text-white font-extrabold shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {language === 'fr' ? 'Connexion' : 'Log In'}
          </button>
          <button
            type="button"
            onClick={() => { setAuthTab('register'); setIs2FAActive(false); setErrorMessage(''); setSuccessMessage(''); }}
            className={`py-2 text-center transition-all cursor-pointer ${
              authTab === 'register' ? 'bg-[#E85D42] text-white font-extrabold shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {language === 'fr' ? 'S’inscrire' : 'Register'}
          </button>
          <button
            type="button"
            onClick={() => { setAuthTab('newsletter'); setIs2FAActive(false); setErrorMessage(''); setSuccessMessage(''); }}
            className={`py-2 text-center transition-all cursor-pointer ${
              authTab === 'newsletter' ? 'bg-[#E85D42] text-white font-extrabold shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {language === 'fr' ? 'Newsletter' : 'Newsletter'}
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMessage && (
          <div className="mb-6 p-3 bg-red-950/50 border border-red-800 text-red-200 text-xs font-medium animate-fadeIn text-left">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs font-medium animate-fadeIn text-left flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 2FA Challenge Verification Form */}
        {is2FAActive ? (
          <form onSubmit={handleVerify2FA} className="space-y-5 text-left">
            <div className="p-4 bg-[#E85D42]/10 border border-[#E85D42]/30 text-center">
              <div className="flex items-center justify-center gap-2 text-[#E85D42] font-black uppercase text-xs tracking-wider mb-1">
                <ShieldCheck size={20} />
                <span>{language === 'fr' ? 'VÉRIFICATION SÉCURISÉE 2FA' : 'SECURE 2FA VERIFICATION'}</span>
              </div>
              <p className="text-xs text-zinc-300">
                {language === 'fr'
                  ? `Code de sécurité à 6 chiffres généré pour ${pendingAccount?.email}.`
                  : `6-digit security code generated for ${pendingAccount?.email}.`}
              </p>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono flex items-center justify-between">
              <span>{language === 'fr' ? 'Code 2FA :' : '2FA Code:'} <strong>{generatedCode}</strong></span>
              <button
                type="button"
                onClick={() => setInputCode(generatedCode)}
                className="text-[10px] font-bold uppercase px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-pointer"
              >
                {language === 'fr' ? 'Remplir automatiquement' : 'Auto-fill'}
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase font-bold text-zinc-400 mb-1">
                {language === 'fr' ? 'Saisir le Code 2FA' : 'Enter 2FA Code'}
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full bg-zinc-950 border border-zinc-800 px-4 py-3 text-center text-lg font-mono font-bold tracking-widest text-white focus:outline-none focus:border-[#E85D42]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#E85D42] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#d04b32] transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
              <span>{language === 'fr' ? 'Valider et accéder au compte' : 'Verify & Enter Dashboard'}</span>
            </button>
          </form>
        ) : authTab === 'newsletter' ? (
          /* Newsletter Signup Form */
          <form onSubmit={handleNewsletterSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-mono uppercase font-bold text-zinc-400 mb-1">
                {language === 'fr' ? 'Votre Adresse E-mail' : 'Your Email Address'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@domaine.com"
                  className="w-full bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-[#E85D42]"
                />
                <Mail size={16} className="absolute left-3.5 top-3.5 text-zinc-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{ backgroundColor: accentColor }}
              className="w-full py-3.5 text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <Mail size={16} />}
              <span>{language === 'fr' ? 'S’abonner au Club des Lecteurs' : 'Subscribe to Readers Club'}</span>
            </button>

            <div className="border-t border-zinc-800 pt-4 text-center">
              <p className="text-[11px] text-zinc-400">
                {language === 'fr' ? 'Vous possédez déjà un compte membre ?' : 'Already have a member account?'}
              </p>
              <button
                type="button"
                onClick={() => setAuthTab('login')}
                className="mt-1 text-xs font-bold text-[#E85D42] hover:underline cursor-pointer"
              >
                {language === 'fr' ? 'Se connecter à mon espace' : 'Log in to my dashboard'}
              </button>
            </div>
          </form>
        ) : (
          /* Main Auth Form (Login & Register) */
          <form onSubmit={handleAuthSubmit} className="space-y-4 text-left">
            {authTab === 'register' && (
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-zinc-400 mb-1">
                  {language === 'fr' ? 'Nom complet / Titre' : 'Full Name / Title'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={language === 'fr' ? 'Mamadou Diallo' : 'John Doe'}
                    className="w-full bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-[#E85D42]"
                  />
                  <User size={16} className="absolute left-3.5 top-3.5 text-zinc-500" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono uppercase font-bold text-zinc-400 mb-1">
                {language === 'fr' ? 'Adresse E-mail' : 'Email Address'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@domaine.com"
                  className="w-full bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-[#E85D42]"
                />
                <Mail size={16} className="absolute left-3.5 top-3.5 text-zinc-500" />
              </div>
            </div>

            {/* Preferred Credential Switcher */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-mono uppercase font-bold text-zinc-400">
                  {language === 'fr' ? 'Mode d’authentification' : 'Auth Method'}
                </label>
                <div className="flex gap-2 text-[9px] font-mono font-bold uppercase">
                  <button
                    type="button"
                    onClick={() => setAuthType('password')}
                    className={`px-2 py-0.5 border cursor-pointer ${
                      authType === 'password' ? 'bg-[#E85D42] text-white border-[#E85D42]' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    Mot de passe
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthType('pin')}
                    className={`px-2 py-0.5 border cursor-pointer ${
                      authType === 'pin' ? 'bg-[#E85D42] text-white border-[#E85D42]' : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    Code PIN
                  </button>
                </div>
              </div>

              {authType === 'password' ? (
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-[#E85D42]"
                  />
                  <Lock size={16} className="absolute left-3.5 top-3.5 text-zinc-500" />
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full bg-zinc-950 border border-zinc-800 pl-10 pr-4 py-3 text-xs text-white font-mono tracking-widest focus:outline-none focus:border-[#E85D42]"
                  />
                  <Key size={16} className="absolute left-3.5 top-3.5 text-zinc-500" />
                </div>
              )}
            </div>

            {authTab === 'login' && authType === 'password' && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-[10px] font-mono text-zinc-400 hover:text-[#E85D42] underline cursor-pointer"
                >
                  {language === 'fr' ? 'Mot de passe oublié ?' : 'Forgot password?'}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{ backgroundColor: accentColor }}
              className="w-full py-3.5 text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? <RefreshCw className="animate-spin" size={16} /> : <ArrowRight size={16} />}
              <span>
                {authTab === 'login'
                  ? language === 'fr' ? 'Se connecter' : 'Sign In'
                  : language === 'fr' ? 'Créer mon compte membre' : 'Create Member Account'}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
