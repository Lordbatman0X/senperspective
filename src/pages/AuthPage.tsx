import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { passwordResetErrorMessage } from '../firebase/auth';
import { Mail, Key, ShieldCheck, User, ArrowRight, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language, siteSettings, addSubscriber } = useStore();
  const { login, register, loginWithGoogle, resetPassword, confirmPasswordReset } = useAuth();

  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');

  // Password-reset completion state.
  // Firebase delivers the emailed code as `oobCode` on the redirect URL. It is
  // mirrored into sessionStorage so a reload — or opening the link in a new
  // tab after the first one consumed the query string — still works.
  const [resetOobCode, setResetOobCode] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    const fromUrl = searchParams.get('oobCode');
    if (fromUrl) {
      try { sessionStorage.setItem('sp_pw_reset_code', fromUrl); } catch { /* private mode */ }
      setResetOobCode(fromUrl);
      return;
    }
    try { setResetOobCode(sessionStorage.getItem('sp_pw_reset_code')); } catch { /* ignore */ }
  }, [searchParams]);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const accentColor = siteSettings?.accentColor || '#E85D42';

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage(language === 'fr' ? 'Adresse e-mail valide requise.' : 'Valid email address required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (authTab === 'login') {
        if (!password) {
          setErrorMessage(language === 'fr' ? 'Veuillez saisir votre mot de passe.' : 'Please enter your password.');
          setIsSubmitting(false);
          return;
        }

        const prof = await login(email.trim(), password);
        setSuccessMessage(language === 'fr' ? `Bienvenue ${prof.name} !` : `Welcome ${prof.name}!`);
        setTimeout(() => {
          navigate('/profile/' + encodeURIComponent(prof.email));
        }, 600);
      } else {
        if (!name.trim()) {
          setErrorMessage(language === 'fr' ? 'Veuillez indiquer votre nom complet.' : 'Please enter your full name.');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setErrorMessage(language === 'fr' ? 'Le mot de passe doit comporter au moins 6 caractères.' : 'Password must be at least 6 characters.');
          setIsSubmitting(false);
          return;
        }

        const prof = await register(email.trim(), password, name.trim());
        try {
          addSubscriber(email.trim());
        } catch {
          // ignore
        }
        setSuccessMessage(
          language === 'fr'
            ? 'Votre compte membre Perspective a été créé avec succès !'
            : 'Your Perspective membership account was created successfully!'
        );
        setTimeout(() => {
          navigate('/profile/' + encodeURIComponent(prof.email));
        }, 800);
      }
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      let userMsg = err.message || 'Erreur de connexion';
      if (err.message?.includes('user-not-found') || err.message?.includes('wrong-password') || err.message?.includes('invalid-credential')) {
        userMsg = language === 'fr' ? 'Identifiants incorrects. Vérifiez votre e-mail et mot de passe.' : 'Invalid credentials. Please verify your email and password.';
      } else if (err.message?.includes('email-already-in-use')) {
        userMsg = language === 'fr' ? 'Cette adresse e-mail possède déjà un compte. Veuillez vous connecter.' : 'This email is already in use. Please log in.';
      }
      setErrorMessage(userMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const prof = await loginWithGoogle();
      setSuccessMessage(language === 'fr' ? `Connecté avec Google en tant que ${prof.name}` : `Signed in with Google as ${prof.name}`);
      setTimeout(() => {
        navigate('/profile/' + encodeURIComponent(prof.email));
      }, 600);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      setErrorMessage(err.message || 'Erreur lors de la connexion Google');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email || !email.includes('@')) {
      setErrorMessage(language === 'fr' ? 'Veuillez saisir votre adresse e-mail ci-dessus.' : 'Please enter your email address above.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await resetPassword(email);
      setSuccessMessage(
        language === 'fr'
          ? 'Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d’être envoyé. Vérifiez vos.spams.'
          : 'If an account exists for that address, a reset email has just been sent. Please check your spam folder.'
      );
    } catch (err: any) {
      // Raw Firebase codes are meaningless to a reader; translate them through
      // the existing FR/EN mechanism.
      setErrorMessage(
        passwordResetErrorMessage(err?.code || '', language === 'fr', err?.message)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOobCode) {
      setResetError(language === 'fr' ? 'Lien de réinitialisation introuvable.' : 'Reset link not found.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setResetError(language === 'fr' ? 'Le mot de passe doit contenir au moins 6 caractères.' : 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError(language === 'fr' ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    setResetError('');
    try {
      await confirmPasswordReset(resetOobCode, newPassword);
      setResetDone(true);
    } catch (err: any) {
      setResetError(
        passwordResetErrorMessage(err?.code || '', language === 'fr', err?.message)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // A reader arriving from the emailed link sees only the "set a new password"
  // step — the sign-in/sign-up tabs are hidden so there is no ambiguity about
  // what the page is asking for.
  if (resetOobCode || resetDone) {
    return (
      <div className="min-h-[85vh] w-full bg-zinc-950 text-zinc-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-[#E85D42] to-rose-600"
            style={{ backgroundColor: accentColor }}
          />

          {resetDone ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: accentColor }} />
              <h2 className="text-xl font-extrabold uppercase tracking-tight mb-2">
                {language === 'fr' ? 'Mot de passe mis à jour' : 'Password updated'}
              </h2>
              <p className="text-sm text-zinc-400 mb-6">
                {language === 'fr'
                  ? 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.'
                  : 'You can now sign in with your new password.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setResetDone(false);
                  setResetOobCode(null);
                  setNewPassword('');
                  setConfirmPassword('');
                  try { sessionStorage.removeItem('sp_pw_reset_code'); } catch { /* ignore */ }
                  setAuthTab('login');
                }}
                className="w-full py-3 font-bold uppercase tracking-widest text-white text-sm transition-colors"
                style={{ backgroundColor: accentColor }}
              >
                {language === 'fr' ? 'Aller à la connexion' : 'Go to sign in'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSetNewPassword}>
              <h2 className="text-xl font-extrabold uppercase tracking-tight mb-1">
                {language === 'fr' ? 'Nouveau mot de passe' : 'Set a new password'}
              </h2>
              <p className="text-xs text-zinc-400 font-mono mb-6">
                {language === 'fr' ? 'Perspective Group' : 'Perspective Group'}
              </p>

              <div className="space-y-4">
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={language === 'fr' ? 'Nouveau mot de passe' : 'New password'}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#E85D42]/70 transition-colors"
                  />
                </div>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={language === 'fr' ? 'Confirmer le mot de passe' : 'Confirm new password'}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#E85D42]/70 transition-colors"
                  />
                </div>
              </div>

              {resetError && (
                <div className="mt-4 flex items-start gap-2 border border-red-900/60 bg-red-950/30 text-red-300 text-xs px-3 py-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{resetError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full py-3 font-bold uppercase tracking-widest text-white text-sm transition-colors disabled:opacity-60"
                style={{ backgroundColor: accentColor }}
              >
                {isSubmitting
                  ? (language === 'fr' ? 'Enregistrement…' : 'Saving…')
                  : (language === 'fr' ? 'Enregistrer' : 'Save password')}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] w-full bg-zinc-950 text-zinc-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Top Accent Line */}
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-[#E85D42] to-rose-600"
          style={{ backgroundColor: accentColor }}
        />

        {/* Header Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#E85D42]/10 border border-[#E85D42]/30 text-[#E85D42] text-[10px] font-mono font-bold uppercase tracking-widest rounded-full mb-3">
            <Sparkles size={12} />
            <span>Perspective Group • Cloud Auth</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-black uppercase tracking-tight text-white mb-1.5">
            {authTab === 'login'
              ? language === 'fr' ? 'Espace Authentification' : 'Subscriber Sign In'
              : language === 'fr' ? 'Rejoindre Perspective' : 'Join Perspective Group'}
          </h1>
          <p className="text-xs text-zinc-400 font-medium leading-relaxed">
            {authTab === 'login'
              ? language === 'fr'
                ? 'Authentification unifiée disponible sur tous vos appareils.'
                : 'Unified cloud authentication recognized on any browser or device.'
              : language === 'fr'
                ? 'Créez votre compte pour sauvegarder vos lectures et participer aux débats.'
                : 'Create an account to save bookmarks and engage in discussions.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-800 mb-6 font-mono text-xs font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => { setAuthTab('login'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 py-3 text-center border-b-2 transition-colors cursor-pointer ${
              authTab === 'login'
                ? 'border-[#E85D42] text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {language === 'fr' ? 'Connexion' : 'Sign In'}
          </button>
          <button
            type="button"
            onClick={() => { setAuthTab('register'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 py-3 text-center border-b-2 transition-colors cursor-pointer ${
              authTab === 'register'
                ? 'border-[#E85D42] text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {language === 'fr' ? 'Créer un compte' : 'Register'}
          </button>
        </div>

        {/* Alert Messages */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting}
          className="w-full py-2.5 px-4 mb-4 bg-zinc-950 border border-zinc-700 hover:border-zinc-500 text-zinc-200 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-3 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>{language === 'fr' ? 'Continuer avec Google' : 'Continue with Google'}</span>
        </button>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-zinc-800"></div>
          <span className="flex-shrink mx-3 text-[10px] uppercase font-mono text-zinc-500">
            {language === 'fr' ? 'ou par e-mail' : 'or with email'}
          </span>
          <div className="flex-grow border-t border-zinc-800"></div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {authTab === 'register' && (
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">
                {language === 'fr' ? 'Nom et Prénom' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Kader Diaz"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#E85D42]/70 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-400 mb-1.5">
              {authTab === 'login'
                ? (language === 'fr' ? 'Adresse E-mail ou Identifiant' : 'Email Address or Username')
                : (language === 'fr' ? 'Adresse E-mail' : 'Email Address')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type={authTab === 'login' ? 'text' : 'email'}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={authTab === 'login' ? (language === 'fr' ? 'kadersdiaz ou nom@exemple.com' : 'kadersdiaz or name@domain.com') : 'nom@exemple.com'}
                className="w-full bg-zinc-950 border border-zinc-800 text-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#E85D42]/70 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                {language === 'fr' ? 'Mot de passe' : 'Password'}
              </label>
              {authTab === 'login' && (
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-[10px] font-bold text-[#E85D42] hover:underline"
                >
                  {language === 'fr' ? 'Mot de passe oublié ?' : 'Forgot password?'}
                </button>
              )}
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 text-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#E85D42]/70 transition-colors tracking-widest"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 mt-2 text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
            style={{ backgroundColor: accentColor }}
          >
            {authTab === 'login' ? <ArrowRight size={16} /> : <ShieldCheck size={16} />}
            <span>
              {isSubmitting
                ? 'Connexion en cours...'
                : authTab === 'login'
                ? (language === 'fr' ? 'Se connecter' : 'Sign In')
                : (language === 'fr' ? 'Créer mon compte' : 'Create Account')}
            </span>
          </button>

          <div className="border-t border-zinc-800 pt-3 text-center">
            {authTab === 'register' ? (
              <p className="text-[11px] text-zinc-400">
                {language === 'fr' ? 'Vous possédez déjà un compte ? ' : 'Already have an account? '}
                <button
                  type="button"
                  onClick={() => setAuthTab('login')}
                  className="font-bold text-[#E85D42] hover:underline cursor-pointer"
                >
                  {language === 'fr' ? 'Se connecter' : 'Sign In'}
                </button>
              </p>
            ) : (
              <p className="text-[11px] text-zinc-400">
                {language === 'fr' ? 'Nouveau sur Perspective ? ' : 'New to Perspective? '}
                <button
                  type="button"
                  onClick={() => setAuthTab('register')}
                  className="font-bold text-[#E85D42] hover:underline cursor-pointer"
                >
                  {language === 'fr' ? 'Créer un compte' : 'Register now'}
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
