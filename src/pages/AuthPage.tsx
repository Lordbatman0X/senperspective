import { SocialLoginButtons } from '../components/SocialLoginButtons';
import { auth } from "../lib/mongodb";
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Key, Lock, CheckCircle2, ShieldCheck, User, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, siteSettings, addSubscriber } = useStore();
  const { user: firebaseUser, loginWithEmail, loginWithSocial, registerWithEmail, resetUserPassword } = useAuth();

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

  const handleSocialSignIn = async (provider: 'google' | 'github' | 'apple' | 'facebook') => {
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await loginWithSocial(provider);
      if (authTab === "newsletter") {
         const gUser = auth.currentUser;
         if (gUser && gUser.email) {
           await addSubscriber(gUser.email);
           setSuccessMessage(language === "fr" ? "Abonnement réussi !" : "Subscription successful!");
         }
      } else {
         navigate("/admin");
      }
    } catch (err: any) {
      setErrorMessage(err.message || `${provider} sign in failed`);
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

        await loginWithEmail(email.trim(), credential);
        setSuccessMessage(language === 'fr' ? 'Connexion réussie !' : 'Authentication successful!');
        setTimeout(() => {
          navigate('/profile/' + encodeURIComponent(email.trim()));
        }, 1000);
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
            onClick={() => { setAuthTab('login'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`py-2.5 text-center transition-colors ${authTab === 'login' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
          >
            {language === 'fr' ? 'Connexion' : 'Log In'}
          </button>
          <button
            type="button"
            onClick={() => { setAuthTab('register'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`py-2.5 text-center transition-colors ${authTab === 'register' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
          >
            {language === 'fr' ? 'Inscription' : 'Register'}
          </button>
          <button
            type="button"
            onClick={() => { setAuthTab('newsletter'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`py-2.5 text-center transition-colors ${authTab === 'newsletter' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
          >
            {language === 'fr' ? 'Newsletter' : 'Newsletter'}
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 text-xs flex flex-col gap-1">
            <span className="font-bold uppercase tracking-wider">Erreur d'authentification</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 text-xs flex flex-col gap-1">
            <span className="font-bold uppercase tracking-wider">Succès</span>
            <span>{successMessage}</span>
          </div>
        )}

        {authTab === 'newsletter' ? (
          <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">{language === 'fr' ? 'Adresse E-mail' : 'Email Address'}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@perspective.sn"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#E85D42]/50 transition-colors placeholder:text-zinc-700"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 mt-2 text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
              style={{ backgroundColor: accentColor }}
            >
              <CheckCircle2 size={16} />
              <span>{isSubmitting ? 'Traitement...' : language === 'fr' ? "S'abonner au Club" : 'Join the Club'}</span>
            </button>
            
            <SocialLoginButtons language={language} handleSocialSignIn={handleSocialSignIn} isSubmitting={isSubmitting} />
            
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
          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
            {authTab === 'register' && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">{language === 'fr' ? 'Nom complet' : 'Full Name'}</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Amadou Sow"
                    className="w-full bg-zinc-950 border border-zinc-800 text-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#E85D42]/50 transition-colors placeholder:text-zinc-700"
                  />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1.5">{language === 'fr' ? 'Adresse E-mail' : 'Email Address'}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#E85D42]/50 transition-colors placeholder:text-zinc-700"
                />
              </div>
            </div>

            <div className="mt-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{language === 'fr' ? 'Sécurité' : 'Security'}</label>
                {authTab === 'login' && (
                  <button type="button" onClick={handleResetPassword} className="text-[10px] font-bold text-[#E85D42] hover:underline">
                    {language === 'fr' ? 'Mot de passe oublié ?' : 'Forgot password?'}
                  </button>
                )}
              </div>
              <div className="flex gap-2 p-1 bg-zinc-950 border border-zinc-800 mb-3 font-mono text-[10px] font-bold uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => setAuthType('password')}
                  className={`flex-1 py-2 text-center transition-colors ${authType === 'password' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Mot de passe
                </button>
                <button
                  type="button"
                  onClick={() => setAuthType('pin')}
                  className={`flex-1 py-2 text-center transition-colors ${authType === 'pin' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Code PIN
                </button>
              </div>

              {authType === 'password' ? (
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-950 border border-zinc-800 text-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#E85D42]/50 transition-colors placeholder:text-zinc-700 tracking-widest"
                  />
                </div>
              ) : (
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/D/g, ''))}
                    placeholder="1234"
                    className="w-full bg-zinc-950 border border-zinc-800 text-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#E85D42]/50 transition-colors placeholder:text-zinc-700 tracking-widest"
                  />
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 mt-2 text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
              style={{ backgroundColor: accentColor }}
            >
              {authTab === 'login' ? <ArrowRight size={16} /> : <ShieldCheck size={16} />}
              <span>{isSubmitting ? 'Traitement...' : authTab === 'login' ? (language === 'fr' ? 'Accéder au portail' : 'Enter Portal') : (language === 'fr' ? 'Créer mon compte' : 'Create Account')}</span>
            </button>
            
            <SocialLoginButtons language={language} handleSocialSignIn={handleSocialSignIn} isSubmitting={isSubmitting} />

            {authTab === 'register' ? (
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
            ) : (
               <div className="border-t border-zinc-800 pt-4 text-center">
                 <p className="text-[11px] text-zinc-400">
                   {language === 'fr' ? 'Nouveau sur Perspective ?' : 'New to Perspective?'}
                 </p>
                 <button
                   type="button"
                   onClick={() => setAuthTab('register')}
                   className="mt-1 text-xs font-bold text-[#E85D42] hover:underline cursor-pointer"
                 >
                   {language === 'fr' ? 'Créer un compte gratuitement' : 'Create a free account'}
                 </button>
               </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
