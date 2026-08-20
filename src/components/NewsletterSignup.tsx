import React, { useState } from 'react';
import { useStore } from '../store';
import { Mail, CheckCircle2 } from 'lucide-react';

export const NewsletterSignup: React.FC = () => {
  const { language, siteSettings, addSubscriber } = useStore();
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
          )}
        </div>
      </div>
    </section>
  );
};

