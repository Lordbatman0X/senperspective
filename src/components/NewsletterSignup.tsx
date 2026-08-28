import React, { useState } from 'react';
import { useStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { Mail, CheckCircle2 } from 'lucide-react';

export const NewsletterSignup: React.FC = () => {
  const { language, siteSettings, addSubscriber } = useStore();
  const { loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const accentColor = siteSettings?.accentColor || '#E85D42';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setIsSubmitting(true);
    try {
      await addSubscriber(email.trim());
      setIsSuccess(true);
      setEmail('');
    } catch (err) {
      console.error('Newsletter signup error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="newsletter-signup" className="w-full bg-zinc-900 text-zinc-100 py-16 px-4 sm:px-6 lg:px-8 border-t border-zinc-800 relative overflow-hidden font-sans">
      <div className="max-w-2xl mx-auto text-center relative z-10">
        <div className="bg-zinc-950 border border-zinc-800 p-8 sm:p-10 rounded-2xl shadow-2xl">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#E85D42]/10 border border-[#E85D42]/30 flex items-center justify-center text-[#E85D42]">
            <Mail size={22} />
          </div>
          <span className="inline-block px-3 py-1 mb-3 bg-[#E85D42]/15 text-[#E85D42] border border-[#E85D42]/30 text-[10px] font-mono font-bold uppercase tracking-widest rounded-full">
            {language === 'fr' ? 'Club des Lecteurs Perspective' : 'Perspective Readers Club'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-white uppercase tracking-tight mb-2">
            {language === 'fr' ? 'Rejoignez le Club des Lecteurs' : 'Join the Readers Club'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mb-6 max-w-lg mx-auto leading-relaxed">
            {language === 'fr'
              ? 'Recevez chaque matin le briefing confidentiel de la Rédaction, les décryptages stratégiques du Sahel et l’actualité en exclusivité.'
              : 'Receive the confidential editorial briefing, strategic Sahel analyses, and exclusive breaking news dispatches directly in your inbox.'}
          </p>

          {isSuccess ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 size={18} />
                <span>{language === 'fr' ? 'Abonnement validé !' : 'Subscription confirmed!'}</span>
              </div>
              <p className="text-xs text-zinc-300">
                {language === 'fr' ? 'Merci pour votre confiance.' : 'Thank you for subscribing.'}
              </p>
              <button
                type="button"
                onClick={() => setIsSuccess(false)}
                className="text-[11px] font-mono text-zinc-400 hover:text-white underline cursor-pointer mt-2"
              >
                {language === 'fr' ? 'Inscrire une autre adresse' : 'Subscribe another email'}
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await loginWithGoogle();
                  } catch (e) { console.error(e); }
                }}
                className="w-full py-3.5 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-xl hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2 mb-3"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                <span>{language === "fr" ? "Continuer avec Google" : "Continue with Google"}</span>
              </button>
              <div className="flex items-center justify-center my-3">
                <div className="border-t border-zinc-800 flex-grow"></div>
                <span className="px-3 text-[10px] text-zinc-500 uppercase font-mono">{language === "fr" ? "OU" : "OR"}</span>
                <div className="border-t border-zinc-800 flex-grow"></div>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={language === 'fr' ? 'Votre adresse e-mail...' : 'Your email address...'}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-zinc-100 focus:outline-none focus:border-[#E85D42]"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ backgroundColor: accentColor }}
                  className="px-6 py-3 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer hover:opacity-90 disabled:opacity-55"
                >
                  {language === 'fr' ? 'S’abonner' : 'Subscribe'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
