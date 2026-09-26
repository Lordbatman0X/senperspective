/**
 * Editorial copy for the category hub pages.
 *
 * WHY THIS EXISTS
 * ---------------
 * The homepage and all category pages were SPA-only: they shipped an empty
 * #root and every word arrived after JavaScript ran. On the Spark plan there
 * is no SSR, so a crawler that does not execute JS saw nothing at all for the
 * site's most important entry points. Articles were already prerendered; the
 * category hubs are the next most valuable thing, because they carry the
 * site's topical authority for each subject.
 *
 * Kept in its own file so the copy is reviewable on its own. `keywords` is
 * deliberately absent: the keywords meta tag has been ignored by Google since
 * 2009 and is only noise.
 */
export const CATEGORY_HUBS = [
  {
    slug: 'politique',
    heading: 'Politique',
    title: 'Politique au Sénégal : actu, décisions et analyses | SenPerspective',
    description:
      "L'actualité politique sénégalaise et régionale : décisions de l'État, coalitions, institutions et décryptages de la rédaction.",
    intro:
      "Suivi de la vie politique du Sénégal et de la sous-région : décisions gouvernementales, rapports de force entre les coalitions et évolution des institutions.",
    sections: [
      {
        h: 'Ce que couvre cette rubrique',
        p: "Les nominations et décisions de l'exécutif, les débats parlementaires, la gouvernance des collectivités territoriales et les rapports de force au Sénégal comme dans la sous-région.",
      },
      {
        h: 'Notre approche',
        p: "Nous distinguons le fait de l'interprétation : chaque sujet est rattaché à sa source primaire, et la mise en perspective est signalée comme telle.",
      },
    ],
  },
  {
    slug: 'economie',
    heading: 'Économie',
    title: 'Économie : marchés, entreprises et Sahel | SenPerspective',
    description:
      "Économie du Sénégal et du Sahel : croissance, marchés, secteur privé, investissements et analyses des politiques économiques.",
    intro:
      "Économie, marchés et entreprises : croissance, monnaie, secteur privé, investissements étrangers et politiques économiques du Sénégal et du Sahel.",
    sections: [
      {
        h: 'Les sujets suivis',
        p: "Indicateurs macroéconomiques, évolution du secteur privé, projets d'investissement, marché de l'emploi et décisions de politique économique.",
      },
      {
        h: 'Pourquoi cela compte',
        p: "L'économie sénégalaise est liée à celle de la zone franc et aux projets d'infrastructure régionaux : une décision prise à Dakar change concrètement la vie des entreprises et des ménages.",
      },
    ],
  },
  {
    slug: 'societe',
    heading: 'Société',
    title: 'Société : transformation et quotidien au Sénégal | SenPerspective',
    description:
      'Actualité de la société sénégalaise : transformation, culture, vie quotidienne, solidarités et débats de société.',
    intro:
      "Ce qui change dans le quotidien des Sénégalais : transformations urbaines, culture, solidarités, place des femmes et des jeunes.",
    sections: [
      {
        h: 'La société au quotidien',
        p: "Nous suivons les transformations qui changent le quotidien des familles dakaroises et des villes secondaires : logement, transport, éducation, santé.",
      },
      {
        h: 'Débats et culture',
        p: "Identité, héritage, pratiques religieuses et arts : la culture sénégalaise est un sujet d'actualité, pas une rubrique décorative.",
      },
    ],
  },
  {
    slug: 'tech-innovation',
    heading: 'Tech & Innovation',
    title: 'Technologie et innovation au Sénégal et en Afrique | SenPerspective',
    description:
      "Technologie, startups et innovation en Afrique de l'Ouest : fintech, télécoms, énergie numérique et écosystème sénégalais.",
    intro:
      "Technologie et innovation en Afrique de l'Ouest : fintech, télécoms, énergie, agriculture numérique et écosystème de startups sénégalais.",
    sections: [
      {
        h: "L'écosystème numérique",
        p: "Startups, opérateurs télécoms et fintechs : nous suivons les acteurs qui transforment l'accès aux services au Sénégal et dans la sous-région.",
      },
      {
        h: 'Au-delà du gadget',
        p: "Nous privilégions les technologies dont l'effet est mesurable : paiements mobile, santé connectée, logistique et agriculture de précision.",
      },
    ],
  },
  {
    slug: 'culture',
    heading: 'Culture',
    title: 'Culture sénégalaise et africaine : arts et patrimoine | SenPerspective',
    description:
      'Culture du Sénégal et de l’Afrique : musique, arts, cinéma, patrimoine et créations contemporaines.',
    intro:
      "Musique, cinéma, arts plastiques, littérature et patrimoine : la culture sénégalaise et africaine racontée au-delà des clichés touristiques.",
    sections: [
      {
        h: 'La création en mouvement',
        p: "Sorties musicales, productions cinématographiques, expositions et publications : nous suivons la création contemporaine sénégalaise et ouest-africaine.",
      },
      {
        h: 'Un patrimoine vivant',
        p: "Les traditions ne sont pas un musée : elles se réinterprètent, se transmettent et alimentent la création d'aujourd'hui.",
      },
    ],
  },
  {
    slug: 'sante',
    heading: 'Santé',
    title: 'Santé au Sénégal : systèmes et santé publique | SenPerspective',
    description:
      "Santé publique au Sénégal et en Afrique de l'Ouest : hôpitaux, épidémies, vaccination et politiques de santé.",
    intro:
      "Systèmes de santé au Sénégal et en Afrique de l'Ouest : hôpitaux, épidémies, vaccination, santé mentale et politiques sanitaires.",
    sections: [
      {
        h: 'Santé publique',
        p: "Capacités hospitalières, campagnes de vaccination, maladies transmissibles et réponse des autorités sanitaires.",
      },
      {
        h: 'Accès aux soins',
        p: "Coût des soins, disponibilité des médicaments et accessibilité des services dans les zones hors de Dakar.",
      },
    ],
  },
  {
    slug: 'international',
    heading: 'International',
    title: 'International : Afrique, France et relations régionales | SenPerspective',
    description:
      'Actualité internationale vue depuis Dakar : Afrique de l’Ouest, France, relations internationales et géopolitique.',
    intro:
      "L'actualité internationale lue depuis Dakar : Afrique de l'Ouest, France, relations franco-africaines, géopolitique et diplomatie.",
    sections: [
      {
        h: 'Une lecture sénégalaise',
        p: "Nous traitons les grands dossiers mondiaux pour ce qu'ils impliquent ici : migrations, commerce, sécurité et diplomatie.",
      },
      {
        h: 'Relations franco-africaines',
        p: "Les relations entre la France et ses anciens territoires africains évoluent rapidement. Nous en suivons les effets concrets sur le Sénégal.",
      },
    ],
  },
  {
    slug: 'decryptages',
    heading: 'Décryptages',
    title: 'Décryptages : analyses de la rédaction | SenPerspective',
    description:
      "Décryptages et analyses de la rédaction SenPerspective : comprendre les grands sujets du moment avec contexte et recul.",
    intro:
      "Nos décryptages : comprendre ce qui se joue derrière l'actualité, avec le contexte et le recul que l'urgence du direct ne permet pas.",
    sections: [
      {
        h: 'Notre méthode',
        p: "Chaque décryptage part des faits établis, remonte à leur origine, et distingue ce qui est documenté de ce qui reste une interprétation.",
      },
      {
        h: 'Pourquoi lire la suite',
        p: "Un sujet occupe l'actualité quelques jours ; un décryptage reste utile après, parce qu'il explique le mécanisme plutôt que l'événement.",
      },
    ],
  },
  {
    slug: 'sports',
    heading: 'Sports',
    title: 'Sports au Sénégal : football, LNBA,_navétanes et luches | SenPerspective',
    description:
      "L'actualité sportive sénégalse et africaine : football, LNBA, navétanes, lutte, résultats, analyses et coulisses.",
    intro:
      "Suivi complet du sport sénégalais : LNBA, football, navétanes et lutte, avec les résultats, les analyses et le détail des compétitions.",
    sections: [
      {
        h: 'Ce que couvre cette rubrique',
        p: "Les grands clubs sénégais et leur atualité, le football international et africain, la LNBA, les navétanes et la lutte, ainsi que les sports individuels et les compétitions régionales.",
      },
      {
        h: 'L\'Arène',
        p: "Les scores en direct et les résultats sont servicés par L'Arène, notre espace dédié au sport : classements, calendriers et suivi des compétitions.",
      },
      {
        h: 'Notre approche',
        p: "Nous distinguons le résultat vérifié de la rumeur, et nous expliquons les enjeux sportifs et économiques derrière les décisions des clubs, des fédérations et des sélecteurs.",
      },
    ],
  },
];
