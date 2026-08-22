import React from 'react';
import { useStore } from '../store';
import { Mail, Phone, MapPin, Compass, Shield, CheckCircle2, Sparkles } from 'lucide-react';

export function AboutPage() {
  const { language, siteSettings } = useStore();
  const accentColor = siteSettings?.accentColor || '#E85D42';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 text-zinc-900 dark:text-zinc-100">
      {/* Header Banner */}
      <div className="border-l-4 pl-6 mb-12" style={{ borderColor: accentColor }}>
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#E85D42] block mb-2" style={{ color: accentColor }}>
          {language === 'fr' ? 'À propos de Perspective Group' : 'About Perspective Group'}
        </span>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight font-serif uppercase">
          {language === 'fr' ? 'Voir l’actualité autrement.' : 'Seeing the news differently.'}
        </h1>
      </div>

      {/* Intro Box */}
      <div className="prose prose-lg dark:prose-invert max-w-none space-y-6 leading-relaxed font-sans text-zinc-800 dark:text-zinc-200">
        <p className="text-xl md:text-2xl font-serif font-medium leading-relaxed text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          {language === 'fr'
            ? 'Perspective Group est un média d’information, d’analyse et de réflexion basé à Dakar, au Sénégal.'
            : 'Perspective Group is an information, analysis, and reflection media outlet based in Dakar, Senegal.'}
        </p>

        <p className="text-base md:text-lg text-zinc-700 dark:text-zinc-300">
          {language === 'fr'
            ? 'Nous sommes nés d’une idée simple : l’actualité ne s’arrête pas au titre d’un article. Derrière chaque événement, il y a des faits à comprendre, des enjeux à questionner et parfois des réalités qui méritent d’être davantage mises en lumière.'
            : 'We were born from a simple idea: news does not end with a headline. Behind every event, there are facts to understand, issues to question, and realities that deserve deeper illumination.'}
        </p>

        <p className="text-base md:text-lg text-zinc-700 dark:text-zinc-300">
          {language === 'fr'
            ? 'Notre objectif est de proposer une information accessible, pertinente et sans détour, en prenant le temps de regarder les sujets sous différents angles.'
            : 'Our objective is to deliver accessible, relevant, and straightforward information, taking the time to analyze topics from multiple angles.'}
        </p>

        <p className="text-base md:text-lg text-zinc-700 dark:text-zinc-300">
          {language === 'fr'
            ? 'De Dakar à l’Afrique, de l’Europe au reste du monde, nous nous intéressons à ce qui fait l’actualité et à ce qui façonne notre quotidien : politique, économie, société, sport, santé, technologie, international, décryptage et People.'
            : 'From Dakar to Africa, Europe to the rest of the world, we focus on what makes the news and shapes our daily lives: politics, economy, society, sports, health, technology, international affairs, analysis, and lifestyle.'}
        </p>

        {/* Section 1: Notre manière de faire */}
        <div className="my-10 p-8 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-none space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Compass size={22} style={{ color: accentColor }} />
            <h2 className="text-xl md:text-2xl font-black font-sans uppercase tracking-wider text-zinc-900 dark:text-zinc-100 m-0">
              {language === 'fr' ? 'Notre manière de faire' : 'Our Approach'}
            </h2>
          </div>

          <p className="text-base text-zinc-700 dark:text-zinc-300">
            {language === 'fr'
              ? 'Chez Perspective Group, nous croyons qu’un bon sujet peut informer, mais aussi faire réfléchir.'
              : 'At Perspective Group, we believe a strong story should inform while prompting deeper reflection.'}
          </p>

          <p className="text-base text-zinc-700 dark:text-zinc-300">
            {language === 'fr'
              ? 'Nous privilégions les faits, le contexte et la diversité des points de vue, avec l’envie de rendre l’information plus claire et plus intéressante à suivre.'
              : 'We prioritize facts, context, and diverse viewpoints to render information clearer and engaging.'}
          </p>

          <p className="text-base text-zinc-700 dark:text-zinc-300">
            {language === 'fr'
              ? 'Nous cherchons à mettre en lumière ce qui mérite d’être compris, à donner du contexte aux événements et à faire émerger des perspectives parfois absentes du débat public.'
              : 'We strive to highlight what deserves to be understood, provide context to events, and surface perspectives often missing from public debate.'}
          </p>

          <div className="p-4 bg-white dark:bg-zinc-950 border-l-2 my-4 border-[#E85D42]" style={{ borderColor: accentColor }}>
            <p className="text-sm md:text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 m-0">
              {language === 'fr'
                ? 'Notre approche repose sur trois principes : informer, analyser et questionner.'
                : 'Our approach relies on three principles: inform, analyze, and question.'}
            </p>
          </div>

          <p className="text-base text-zinc-700 dark:text-zinc-300 italic">
            {language === 'fr'
              ? 'Nous ne prétendons pas penser à la place de nos lecteurs. Nous voulons leur donner les éléments nécessaires pour comprendre les faits et se forger leur propre opinion.'
              : 'We do not claim to think on behalf of our readers. We aim to equip them with necessary insights to analyze facts and form their own opinions.'}
          </p>
        </div>

        {/* Section 2: Notre promesse */}
        <div className="my-10 p-8 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 rounded-none space-y-4 border-l-4" style={{ borderLeftColor: accentColor }}>
          <div className="flex items-center gap-3">
            <Shield size={22} style={{ color: accentColor }} />
            <h2 className="text-xl md:text-2xl font-black font-serif uppercase tracking-wider text-zinc-900 dark:text-white m-0">
              {language === 'fr' ? 'Notre promesse' : 'Our Promise'}
            </h2>
          </div>

          <p className="text-2xl md:text-3xl font-black tracking-tight uppercase font-serif" style={{ color: accentColor }}>
            {language === 'fr' ? 'L’actualité. Sans filtre. Sans compromis.' : 'News. Unfiltered. Uncompromised.'}
          </p>

          <p className="text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {language === 'fr'
              ? 'Perspective Group est un média en construction, porté par une équipe qui souhaite grandir avec ses lecteurs, ses partenaires et tous ceux qui partagent cette envie de faire circuler des idées, des histoires et des informations qui comptent.'
              : 'Perspective Group is a growing media platform driven by a team eager to evolve alongside readers, partners, and everyone sharing a passion for impactful stories and vital facts.'}
          </p>

          <p className="text-base text-zinc-800 dark:text-zinc-200 font-semibold italic border-t border-zinc-200 dark:border-zinc-700/80 pt-4">
            {language === 'fr'
              ? 'Parce que notre rôle ne se limite pas à raconter ce qui se passe. Notre rôle est aussi de vous aider à comprendre pourquoi cela se passe.'
              : 'Because our role extends beyond simply reporting events. Our role is to help you understand why they happen.'}
          </p>
        </div>

        {/* Section 3: Nous contacter */}
        <div className="mt-12 p-8 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-none space-y-6">
          <div>
            <h2 className="text-xl md:text-2xl font-black font-sans uppercase tracking-wider text-zinc-900 dark:text-zinc-100 mb-2">
              {language === 'fr' ? 'Nous contacter' : 'Contact Us'}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {language === 'fr'
                ? 'Pour toute question, proposition de collaboration ou demande d’information :'
                : 'For inquiries, partnership proposals, or general information:'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-sm">
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <Mail size={18} className="text-[#E85D42] shrink-0" style={{ color: accentColor }} />
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-sans font-bold">Email</span>
                <a href="mailto:contact@perspective.sn" className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline">
                  contact@perspective.sn
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <Phone size={18} className="text-[#E85D42] shrink-0" style={{ color: accentColor }} />
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block font-sans font-bold">
                  {language === 'fr' ? 'Téléphone' : 'Phone'}
                </span>
                <a href="tel:776818738" className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline">
                  77 681 87 38
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono text-sm">
            <MapPin size={18} className="text-[#E85D42] shrink-0 mt-0.5" style={{ color: accentColor }} />
            <div>
              <span className="text-[10px] text-zinc-500 uppercase block font-sans font-bold">
                {language === 'fr' ? 'Siège & Adresse' : 'Headquarters'}
              </span>
              <p className="font-bold text-zinc-900 dark:text-zinc-100 m-0">
                {language === 'fr' ? 'Perspective Group, Dakar, Sénégal' : 'Perspective Group, Dakar, Senegal'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ContactPage() {
  const { language, siteSettings } = useStore();
  const accentColor = siteSettings?.accentColor || '#E85D42';

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-zinc-900 dark:text-zinc-100">
      <h1 className="text-3xl md:text-5xl font-black uppercase tracking-wider text-brand-dark dark:text-brand-white mb-8">
        {language === 'fr' ? 'Contactez-nous' : 'Contact Us'}
      </h1>
      <div className="square-card p-8 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-w-xl space-y-6">
        <p className="font-semibold text-lg">
          {language === 'fr' ? 'Notre rédaction est à votre écoute.' : 'Our editorial team is at your disposal.'}
        </p>
        <div className="space-y-4 font-mono text-sm">
          <div className="flex items-center gap-3">
            <Mail size={16} style={{ color: accentColor }} />
            <span>Email: contact@perspective.sn</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={16} style={{ color: accentColor }} />
            <span>Tél: 77 681 87 38</span>
          </div>
          <div className="flex items-start gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <MapPin size={16} className="mt-0.5" style={{ color: accentColor }} />
            <span>{language === 'fr' ? 'Perspective Group, Dakar, Sénégal' : 'Perspective Group, Dakar, Senegal'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

