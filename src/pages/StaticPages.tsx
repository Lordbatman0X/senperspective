import React from 'react';
import { useStore } from '../store';

export function AboutPage() {
  const { language } = useStore();

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-brand-dark mb-8">
        {language === 'fr' ? 'À propos de Perspective Group' : 'About Perspective Group'}
      </h1>
      <div className="prose prose-lg prose-brand max-w-none">
        <p>
          {language === 'fr' 
            ? 'Perspective Group est une plateforme analytique d\'intelligence fournissant des éclairages approfondis sur les réalités sénégalaises et africaines à travers le journalisme d\'investigation et l\'expertise géopolitique.'
            : 'Perspective Group is an analytical intelligence platform providing deep-structure insights into Senegalese and African realities through investigative journalism and geopolitical expertise.'}
        </p>
        <p>
          {language === 'fr' 
            ? 'Nous ne nous contentons pas de rapporter les faits. Nous expliquons les systèmes, le pouvoir, l\'argent, les institutions, la société et les conséquences humaines derrière l\'actualité.'
            : 'We do not simply report events. We explain systems, power, money, institutions, society and the human consequences behind the news.'}
        </p>
      </div>
    </div>
  );
}

export function ContactPage() {
  const { language } = useStore();

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-brand-dark mb-8">
        {language === 'fr' ? 'Contactez-nous' : 'Contact Us'}
      </h1>
      <div className="square-card p-8 bg-brand-soft max-w-xl">
        <p className="mb-6 font-semibold">
          {language === 'fr' ? 'Notre rédaction est à votre écoute.' : 'Our editorial team is listening.'}
        </p>
        <div className="space-y-4 font-mono text-brand-dark">
          <p>Email: contact@senperspective.com</p>
          <p>Tel: +221 77 681 87 38</p>
          <p>Tel: +221 78 440 82 04</p>
          <p>Tel: +221 77 369 24 10</p>
        </div>
      </div>
    </div>
  );
}
