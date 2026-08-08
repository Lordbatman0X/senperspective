import { Article } from "./types";

export const sampleArticles: Article[] = [
  {
    id: "sn-dos-001",
    slug: "dakar-real-estate-macro-2026",
    category: "Économie",
    type: "Analysis",
    isPublished: true,
    isFeatured: false,
    title: {
      fr: "Macro-immobilier à Dakar : Quelles perspectives pour 2026 ?",
      en: "Dakar Real Estate Macro: What outlook for 2026?"
    },
    excerpt: {
      fr: "Une analyse complète du marché immobilier dakarois, entre bulle spéculative et demande croissante.",
      en: "A comprehensive analysis of the Dakar real estate market, between a speculative bubble and growing demand."
    },
    body: {
      fr: "L'immobilier à Dakar est l'un des marchés les plus dynamiques de la région. Ce dossier spécial décortique les forces macro-économiques qui propulsent les prix.",
      en: "Real estate in Dakar is one of the most dynamic markets in the region. This special briefing dissects the macroeconomic forces driving up prices."
    },
    featuredImage: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&fit=crop",
    author: "Equipe de Recherche",
    date: "2026-06-13T10:00:00Z",
    readingTime: 12,
    tags: ["Immobilier", "Dakar", "Macros"],
    perspectiveBrief: {
      whatHappened: {
        fr: "Le marché dakarois subit des forces macro-économiques majeures en 2026.",
        en: "The Dakar market is undergoing major macroeconomic shifts in 2026."
      },
      whyItMatters: {
        fr: "Cela affecte directement l'investissement et la logistique financière régionale.",
        en: "This directly impacts regional investment and financial logistics."
      },
      whatToWatchNext: {
        fr: "La législation nationale de régulation des loyers.",
        en: "National rental price ceiling legislations."
      }
    },
    keyActors: [],
    timeline: [],
    relatedArticleIds: []
  },
  {
    id: "sn-pol-001",
    slug: "senegal-political-tension-institutional-balance",
    category: "Politique",
    type: "Deep Dive",
    title: {
      fr: "Tension politique et équilibre institutionnel : Le Sénégal à la croisée des chemins",
      en: "Political Tension and Institutional Balance: Senegal at a Crossroads"
    },
    excerpt: {
      fr: "Comment les récentes secousses politiques redéfinissent l'équilibre des pouvoirs entre l'exécutif, le législatif et le judiciaire.",
      en: "How recent political tremors are redefining the balance of power between the executive, legislative, and judicial branches."
    },
    body: {
      fr: "La politique sénégalaise traverse une période de reconfiguration majeure. Face aux récents défis lancés aux institutions de la République, les mécanismes de contrôle et d'équilibre (checks and balances) ont montré à la fois leur résilience et leurs limites.\n\nHistoriquement, le Sénégal s'est distingué par une stabilité démocratique, mais la concentration du pouvoir exécutif pose aujourd'hui de sérieuses questions. La dissolution de l'Assemblée nationale ou les tensions avec l'opposition radicale modifient la donne. Pour de nombreux experts, ce n'est plus une simple crise conjoncturelle, mais un moment de vérité structurel.\n\nLes implications pour la gouvernance future sont vastes. Si le modèle actuel résiste, il pourrait nécessiter des réformes constitutionnelles pour prévenir de futures impasses.",
      en: "Senegalese politics is undergoing a period of major reconfiguration. Faced with recent challenges to the institutions of the Republic, checks and balances mechanisms have shown both their resilience and their limits.\n\nHistorically, Senegal has distinguished itself with democratic stability, but the concentration of executive power now poses serious questions. The dissolution of the National Assembly or tensions with radical opposition change the landscape. For many experts, this is no longer a simple cyclical crisis, but a structural moment of truth.\n\nThe implications for future governance are vast. If the current model withstands, it may require constitutional reforms to prevent future deadlocks."
    },
    featuredImage: "https://images.unsplash.com/photo-1572949645841-094f3a9c4c94?q=80&w=800&h=800&fit=crop",
    author: "Fatou Diop",
    date: "2025-10-01T08:00:00Z",
    readingTime: 8,
    tags: ["Institutions", "Démocratie", "Gouvernance"],
    isPublished: true,
    isFeatured: true,
    relatedArticleIds: ["sn-gov-001"],
    perspectiveBrief: {
      whatHappened: {
        fr: "De récentes tensions ont mis à l'épreuve l'équilibre des pouvoirs institutionnels à Dakar.",
        en: "Recent tensions have tested the balance of institutional power in Dakar."
      },
      whyItMatters: {
        fr: "La stabilité institutionnelle du Sénégal est une clé de voûte de l'Afrique de l'Ouest.",
        en: "Senegal's institutional stability is a keystone for West Africa."
      },
      whatToWatchNext: {
        fr: "Les prochaines réformes constitutionnelles et recompositions parlementaires.",
        en: "Upcoming constitutional reforms and parliamentary reconfigurations."
      }
    },
    structuralForces: {
      political: { fr: "Hyperprésidentialisme face à une opposition de rupture.", en: "Hyper-presidentialism facing a disruptive opposition." },
      economic: { fr: "Attente de réformes structurelles pour libérer la croissance.", en: "Expectation of structural reforms to unlock growth." },
      social: { fr: "Jeunesse exigeant une transparence totale.", en: "Youth demanding total transparency." },
      international: { fr: "Pression diplomatique pour maintenir le modèle sénégalais.", en: "Diplomatic pressure to maintain the Senegalese model." }
    },
    keyActors: [
      {
        name: "Ousmane Sonko",
        role: "Premier Ministre",
        significance: { fr: "Figure de proue de la rupture systémique.", en: "Figurehead of systemic rupture." }
      },
      {
        name: "Bassirou Diomaye Faye",
        role: "Président de la République",
        significance: { fr: "Garant des institutions et initiateur des réformes.", en: "Guarantor of institutions and initiator of reforms." }
      }
    ],
    timeline: [
      { date: "Avril 2024", description: { fr: "Alternance au sommet de l'État.", en: "Transition at the top of the State." } },
      { date: "Septembre 2024", description: { fr: "Dissolution de l'Assemblée nationale.", en: "Dissolution of the National Assembly." } }
    ]
  },
  {
    id: "sn-eco-001",
    slug: "informal-economy-driving-force",
    category: "Économie",
    type: "Analysis",
    title: {
      fr: "L'économie informelle : véritable moteur ou frein à l'émergence ?",
      en: "The Informal Economy: True Engine or Obstacle to Emergence?"
    },
    excerpt: {
      fr: "Une analyse de la contribution réelle du secteur informel à l'économie sénégalaise et des défis de sa formalisation.",
      en: "An analysis of the real contribution of the informal sector to the Senegalese economy and the challenges of its formalization."
    },
    body: {
      fr: "Le secteur informel représente près de 90 % des emplois au Sénégal et contribue à près de 40 % du PIB. Cependant, cette force apparente masque des vulnérabilités structurelles profondes.\n\nL'absence de protection sociale, l'évasion fiscale systémique et la difficulté d'accès au crédit freinent le développement d'entreprises viables à long terme. Les initiatives gouvernementales pour formaliser ce secteur se heurtent souvent à la méfiance et à la bureaucratie.\n\nUne nouvelle approche est nécessaire, basée sur l'incitation plutôt que sur la coercition, pour intégrer ce vivier économique dans les circuits officiels.",
      en: "The informal sector represents nearly 90% of jobs in Senegal and contributes to almost 40% of GDP. However, this apparent strength masks deep structural vulnerabilities.\n\nThe lack of social protection, systemic tax evasion, and difficulty accessing credit hinder the development of long-term viable businesses. Government initiatives to formalize this sector often face mistrust and bureaucracy.\n\nA new approach is needed, based on incentives rather than coercion, to integrate this economic pool into the official circuits."
    },
    featuredImage: "https://images.unsplash.com/photo-1534008897995-27a23e859048?q=80&w=800&h=800&fit=crop",
    author: "Mamadou Sylla",
    date: "2025-09-28T14:30:00Z",
    readingTime: 6,
    tags: ["Économie", "Secteur Informel", "Emploi"],
    isPublished: true,
    isFeatured: false,
    relatedArticleIds: ["sn-soc-001"]
  },
  {
    id: "sn-soc-001",
    slug: "youth-employment-time-bomb",
    category: "Société",
    type: "Analysis",
    title: {
      fr: "Emploi des jeunes : La bombe à retardement de la démographie sénégalaise",
      en: "Youth Employment: The Ticking Time Bomb of Senegalese Demography"
    },
    excerpt: {
      fr: "Avec plus de 60% de la population ayant moins de 25 ans, le défi de la création d'emplois est existentiel pour le Sénégal.",
      en: "With over 60% of the population under 25, the challenge of job creation is existential for Senegal."
    },
    body: {
      fr: "Chaque année, plus de 300 000 jeunes arrivent sur le marché du travail sénégalais, marché incapable d'en absorber une fraction significative. Cette inadéquation entre l'offre de formation et les besoins réels de l'économie crée des frustrations profondes.\n\nL'exode rural et l'émigration clandestine vers l'Europe ne sont que les symptômes d'une économie qui peine à créer de la valeur ajoutée locale. Les programmes étatiques se multiplient mais peinent à offrir des solutions pérennes au-delà du saupoudrage institutionnel.\n\nAucune stabilité politique à long terme n'est envisageable sans la résolution active du chômage endémique des jeunes.",
      en: "Every year, more than 300,000 young people enter the Senegalese labor market, a market unable to absorb a significant fraction. This mismatch between training offered and the real needs of the economy creates deep frustrations.\n\nRural exodus and illegal emigration to Europe are merely symptoms of an economy struggling to create local added value. State programs multiply but fail to offer sustainable solutions beyond institutional window-dressing.\n\nNo long-term political stability is conceivable without actively resolving the endemic youth unemployment."
    },
    featuredImage: "https://images.unsplash.com/photo-1520626337972-009ab95cd6bb?q=80&w=800&h=800&fit=crop",
    author: "Aminata Sall",
    date: "2025-09-25T10:15:00Z",
    readingTime: 7,
    tags: ["Jeunesse", "Emploi", "Société"],
    isPublished: true,
    isFeatured: true,
    relatedArticleIds: ["sn-eco-001"]
  },
  {
    id: "sn-int-001",
    slug: "senegal-transactional-non-alignment",
    category: "International",
    type: "Deep Dive",
    title: {
      fr: "Le non-alignement transactionnel : La nouvelle doctrine diplomatique du Sénégal",
      en: "Transactional Non-Alignment: Senegal's New Diplomatic Doctrine"
    },
    excerpt: {
      fr: "Entre Paris, Washington, Pékin et Moscou, Dakar redéfinit ses alliances selon une logique strictement pragmatique.",
      en: "Between Paris, Washington, Beijing, and Moscow, Dakar is redefining its alliances according to strictly pragmatic logic."
    },
    body: {
      fr: "L'époque de l'alignement automatique sur le bloc occidental est révolue. Le Sénégal, acteur diplomatique de premier plan sur le continent africain, adopte désormais une posture de 'non-alignement transactionnel'.\n\nCette doctrine se caractérise par une diversification audacieuse des partenariats. Des accords d'infrastructures avec la Chine, aux investissements sécuritaires avec les États-Unis, en passant par des partenariats renouvelés (mais rééquilibrés) avec la France, Dakar joue avec habileté sur la concurrence entre les grandes puissances.\n\nCependant, ce pragmatisme requiert une agilité diplomatique constante pour éviter de subir les contrecoups géopolitiques globaux.",
      en: "The era of automatic alignment with the Western bloc is over. Senegal, a leading diplomatic player on the African continent, is now adopting a posture of 'transactional non-alignment'.\n\nThis doctrine is characterized by a bold diversification of partnerships. From infrastructure deals with China to security investments with the United States, and renewed (yet rebalanced) partnerships with France, Dakar skillfully plays on the competition among major powers.\n\nHowever, this pragmatism requires constant diplomatic agility to avoid suffering global geopolitical backlash."
    },
    featuredImage: "https://images.unsplash.com/photo-1541872703861-55e1c0c1b48b?q=80&w=800&h=800&fit=crop",
    author: "Cheikh Ndiaye",
    date: "2025-09-20T09:00:00Z",
    readingTime: 9,
    tags: ["Diplomatie", "Souveraineté", "Géopolitique"],
    isPublished: true,
    isFeatured: false,
    relatedArticleIds: []
  },
  {
    id: "sn-tech-001",
    slug: "ai-digital-sovereignty-senegal",
    category: "Tech",
    type: "News",
    title: {
      fr: "Intelligence Artificielle et souveraineté numérique : Le réveil de Dakar",
      en: "Artificial Intelligence and Digital Sovereignty: Dakar's Awakening"
    },
    excerpt: {
      fr: "Le gouvernement lance une stratégie nationale pour localiser les données et développer une IA souveraine.",
      en: "The government launches a national strategy to localize data and develop sovereign AI."
    },
    body: {
      fr: "Face à l'hégémonie de la Silicon Valley, le Sénégal dévoile de nouvelles infrastructures pour garantir sa souveraineté numérique. Le nouveau Data Center national, couplé à une initiative visant à former des talents en IA, marque un tournant.\n\nL'enjeu n'est pas seulement technologique, il est démocratique et économique. Contrôler les données des citoyens et les algorithmes qui régissent demain les services publics est devenu une priorité absolue.\n\nMais les défis liés au financement de l'infrastructure et à la rétention des talents locaux face à la fuite des cerveaux rendent l'équation complexe.",
      en: "Faced with Silicon Valley's hegemony, Senegal unveils new infrastructures to guarantee its digital sovereignty. The new national Data Center, coupled with an initiative to train AI talent, marks a turning point.\n\nThe challenge is not only technological; it is democratic and economic. Controlling citizens' data and the algorithms that will govern public services tomorrow has become a top priority.\n\nBut the challenges related to infrastructure financing and retaining local talent amid brain drain make the equation complex."
    },
    featuredImage: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=800&h=800&fit=crop",
    author: "Khoudia Touré",
    date: "2025-09-15T11:45:00Z",
    readingTime: 5,
    tags: ["Tech", "Souveraineté", "IA"],
    isPublished: true,
    isFeatured: true,
    relatedArticleIds: []
  },
  {
    id: "sn-hlth-001",
    slug: "pharmaceutical-sovereignty-madiba-project",
    category: "Santé",
    type: "Deep Dive",
    title: {
      fr: "Souveraineté pharmaceutique : Le pari industriel de Diamniadio",
      en: "Pharmaceutical Sovereignty: The Industrial Gamble of Diamniadio"
    },
    excerpt: {
      fr: "Comment le projet MADIBA vise à réduire la dépendance vaccinale et médicamenteuse de l'Afrique de l'Ouest.",
      en: "How the MADIBA project aims to reduce West Africa's vaccine and pharmaceutical dependency."
    },
    body: {
      fr: "La crise du COVID-19 a brutalement exposé la dépendance vaccinale de l'Afrique. En réponse, le Sénégal, soutenu par l'Institut Pasteur de Dakar et des partenaires internationaux, accélère le développement du pôle industriel MADIBA à Diamniadio.\n\nIl ne s'agit pas d'une simple usine d'assemblage (fill-and-finish), mais du développement complet de capacités de production d'ARN messager, une première dans la sous-région. L'objectif est clair : produire 300 millions de doses de vaccins par an.\n\nAu-delà de la santé publique, ce pôle industriel pourrait repositionner le Sénégal comme un hub biopharmaceutique mondial.",
      en: "The COVID-19 crisis brutally exposed Africa's vaccine dependency. In response, Senegal, supported by the Institut Pasteur de Dakar and international partners, is accelerating the development of the MADIBA industrial hub in Diamniadio.\n\nThis is not a simple 'fill-and-finish' assembly plant, but the complete development of mRNA production capabilities, a first in the sub-region. The goal is clear: produce 300 million doses of vaccines per year.\n\nBeyond public health, this industrial hub could reposition Senegal as a global biopharmaceutical hub."
    },
    featuredImage: "https://images.unsplash.com/photo-1579154204601-01588f351e67?q=80&w=800&h=800&fit=crop",
    author: "Pr. Ibrahima Senghor",
    date: "2025-09-10T13:20:00Z",
    readingTime: 8,
    tags: ["Santé", "Industrie", "Souveraineté"],
    isPublished: true,
    isFeatured: false,
    relatedArticleIds: []
  },
  {
    id: "sn-gov-001",
    slug: "public-procurement-transparency",
    category: "Gouvernance",
    type: "News",
    title: {
      fr: "Commande publique : La traçabilité comme arme anti-corruption",
      en: "Public Procurement: Traceability as an Anti-Corruption Weapon"
    },
    excerpt: {
      fr: "Les nouvelles régulations sur les marchés publics promettent une réformes systématique des audits de l'État.",
      en: "New public procurement regulations promise a systematic reform of state audits."
    },
    body: {
      fr: "Face aux polémiques et aux audits récents, l'Autorité de Régulation de la Commande Publique (ARCOP) renforce ses mesures. L'introduction d'un système entièrement numérisé pour la passation des marchés publics vise à éradiquer les ententes illicites et les surfacturations.\n\nCependant, les réformes institutionnelles, aussi abouties soient-elles sur le papier, se heurtent parfois aux pratiques ancrées et à la résistance des réseaux d'influence. Le succès de cette transparence technologique dépendra de la volonté politique réelle de sanctionner les dérives.\n\nL'accès ouvert aux données sur les contrats extractifs et pétroliers est au centre de cette bataille pour la bonne gouvernance.",
      en: "Faced with recent controversies and audits, the Public Procurement Regulatory Authority (ARCOP) is strengthening its measures. The introduction of a fully digitized system for public procurement aims to eradicate illegal agreements and overcharging.\n\nHowever, institutional reforms, no matter how accomplished on paper, sometimes clash with entrenched practices and the resistance of networks of influence. The success of this technological transparency will depend on the real political will to sanction abuses.\n\nOpen access to data on extractive and oil contracts is at the center of this battle for good governance."
    },
    featuredImage: "https://images.unsplash.com/photo-1589829085489-c4391e0a29ef?q=80&w=800&h=800&fit=crop",
    author: "Abdou Ndiaye",
    date: "2025-09-05T16:00:00Z",
    readingTime: 5,
    tags: ["Gouvernance", "Corruption", "Loi"],
    isPublished: true,
    isFeatured: false,
    relatedArticleIds: ["sn-pol-001"]
  },
  {
    id: "sn-soc-002",
    slug: "dakar-housing-crisis",
    category: "Société",
    type: "Analysis",
    title: {
      fr: "L'inflation immobilière à Dakar : Crise du logement et gentrification",
      en: "Real Estate Inflation in Dakar: Housing Crisis and Gentrification"
    },
    excerpt: {
      fr: "La pression démographique et la spéculation foncière transforment la capitale et repoussent les classes moyennes.",
      en: "Demographic pressure and land speculation are transforming the capital and pushing out the middle class."
    },
    body: {
      fr: "Trouver un logement abordable à Dakar relève désormais du parcours du combattant pour la classe moyenne sénégalaise. Tirée par une forte demande, l'arrivée de travailleurs expatriés et la spéculation, l'inflation immobilière s'accélère à un rythme insoutenable.\n\nDes quartiers historiques se transforment, repoussant les populations vers la banlieue qui est désormais à la limite de Diamniadio ou Thiès, aggravant les problèmes de mobilité urbaine.\n\nLes politiques de logements sociaux peinent à endiguer l'hémorragie, soulevant le besoin impérieux d'une réglementation stricte des loyers et d'un contrôle du développement foncier anarchique.",
      en: "Finding affordable housing in Dakar is now an obstacle course for the Senegalese middle class. Driven by high demand, the arrival of expatriate workers, and speculation, real estate inflation is accelerating at an unsustainable pace.\n\nHistorical neighborhoods are transforming, pushing populations towards suburbs now extending to the limits of Diamniadio or Thiès, worsening urban mobility issues.\n\nSocial housing policies struggle to stem the bleeding, raising the urgent need for strict rent regulation and control over anarchic land development."
    },
    featuredImage: "https://images.unsplash.com/photo-1520626337972-009ab95cd6bb?q=80&w=800&h=800&fit=crop",
    author: "Aminata Sall",
    date: "2025-09-01T10:00:00Z",
    readingTime: 6,
    tags: ["Urbanisme", "Immobilier", "Société"],
    isPublished: true,
    isFeatured: true,
    relatedArticleIds: []
  },
  {
    id: "sn-pubfin-001",
    slug: "decentralisation-municipal-finance",
    category: "Économie",
    type: "Deep Dive",
    title: {
      fr: "Décentralisation : Le nerf de la guerre des finances locales",
      en: "Decentralization: The Sinews of War in Local Finance"
    },
    excerpt: {
      fr: "L'Acte III de la décentralisation reste inachevé faute de ressources financières autonomes pour les collectivités.",
      en: "Act III of decentralization remains incomplete due to a lack of autonomous financial resources for local authorities."
    },
    body: {
      fr: "Le transfert des compétences de l'État vers les collectivités territoriales s'est-il accompagné d'un véritable transfert des ressources ? La réponse, selon les maires du pays, est un non catégorique.\n\nLes municipalités ont hérité de lourdes responsabilités (santé, éducation, urbanisme) mais dépendent encore majoritairement de dotations étatiques souvent distribuées selon des critères jugés opaques ou partisans.\n\nPenser le développement du Sénégal depuis la base implique une refonte totale de la fiscalité locale pour libérer le potentiel des territoires.",
      en: "Has the transfer of state powers to local authorities been accompanied by a real transfer of resources? The answer, according to the country's mayors, is a categorical no.\n\nMunicipalities inherited heavy responsibilities (health, education, urban planning) but still rely mostly on state grants often distributed based on criteria considered opaque or partisan.\n\nThinking about Senegal's development from the grassroots up involves a total overhaul of local taxation to unlock territorial potential."
    },
    featuredImage: "https://images.unsplash.com/photo-1593113568853-3c9902787332?q=80&w=800&h=800&fit=crop",
    author: "Mamadou Sylla",
    date: "2025-08-25T08:30:00Z",
    readingTime: 7,
    tags: ["Finances Publiques", "Décentralisation", "Politique"],
    isPublished: true,
    isFeatured: false,
    relatedArticleIds: []
  },
  {
    id: "sn-reg-001",
    slug: "regional-integration-sahel-logistics",
    category: "International",
    type: "Analysis",
    title: {
      fr: "Intégration régionale : Le port de Dakar face au défi logistique du Sahel",
      en: "Regional Integration: The Port of Dakar Facing the Sahel's Logistics Challenge"
    },
    excerpt: {
      fr: "Le positionnement stratégique du Port Autonome de Dakar est mis à l'épreuve par la concurrence régionale et les crises au Sahel.",
      en: "The strategic positioning of the Autonomous Port of Dakar is tested by regional competition and Sahel crises."
    },
    body: {
      fr: "Hub historique pour les économies enclavées du Mali, du Burkina Faso et du Niger, le Port de Dakar fait face à un double défi : la montée en puissance des ports concurrents (Abidjan, Lomé) et l'instabilité politique au sein de l'AES (Alliance des États du Sahel).\n\nLes corridors de transport sont de plus en plus politisés et l'efficacité logistique devient une arme géopolitique redoutable. Comment le Sénégal peut-il maintenir son leadership maritime sans l'adosser à une vision diplomatique agile dans le sous-continent ?\n\nLes futurs investissements portuaires à Ndayane sont cruciaux, mais ils ne suffiront pas si l'intégration douanière et ferroviaire n'est pas optimisée.",
      en: "A historical hub for landlocked economies in Mali, Burkina Faso, and Niger, the Port of Dakar faces a dual challenge: the rise of competing ports (Abidjan, Lomé) and political instability within the AES (Alliance of Sahel States).\n\nTransport corridors are increasingly politicized, and logistical efficiency is becoming a potent geopolitical weapon. How can Senegal maintain its maritime leadership without anchoring it in agile diplomacy in the subcontinent?\n\nFuture port investments in Ndayane are crucial, but they won't suffice unless customs and railway integration is optimized."
    },
    featuredImage: "https://images.unsplash.com/photo-1542301980-327c4ff75ed6?q=80&w=800&h=800&fit=crop",
    author: "Cheikh Ndiaye",
    date: "2025-08-18T12:00:00Z",
    readingTime: 6,
    tags: ["Logistique", "Économie", "CEDEAO", "AES"],
    isPublished: true,
    isFeatured: false,
    relatedArticleIds: []
  },
  {
    id: "sn-soc-003",
    slug: "religious-institutions-social-resilience",
    category: "Société",
    type: "Explainer",
    title: {
      fr: "Confréries et résilience sociale : La spécificité du modèle sénégalais",
      en: "Brotherhoods and Social Resilience: The Specificity of the Senegalese Model"
    },
    excerpt: {
      fr: "Au-delà de la spiritualité, le rôle fondamental des institutions religieuses comme régulateurs économiques et sociaux pacificateurs.",
      en: "Beyond spirituality, the fundamental role of religious institutions as pacifying economic and social regulators."
    },
    body: {
      fr: "Le dialogue social et la stabilité politique du Sénégal reposent en grande partie sur l'architecture invisible mais prééminente de ses confréries soufies.\n\nLors de chaque grande crise politique ou sociale, les foyers religieux jouent le rôle de médiateurs de dernier recours. De plus, leur dimension économique (modèle de Touba, dynamisme des réseaux de solidarité mourides et tidianes) structure massivement l'économie informelle et pallie les déficiences des filets de sécurité de l'État.\n\nComprendre le Sénégal contemporain nécessite d'analyser l'économie politique de la foi et la mutation de ce pouvoir spirituel face aux réseaux sociaux et à la jeune génération.",
      en: "Senegal's social dialogue and political stability rely largely on the invisible but preeminent architecture of its Sufi brotherhoods.\n\nDuring every major political or social crisis, religious centers play the role of mediators of last resort. Moreover, their economic dimension (the Touba model, dynamism of Mouride and Tijaniyyah solidarity networks) heavily structures the informal economy and compensates for the deficiencies of state safety nets.\n\nUnderstanding contemporary Senegal requires analyzing the political economy of faith and the mutation of this spiritual power in the face of social media and the younger generation."
    },
    featuredImage: "https://images.unsplash.com/photo-1519782522770-b6ab26d5b0c9?q=80&w=800&h=800&fit=crop",
    author: "Société Civile",
    date: "2025-08-10T09:45:00Z",
    readingTime: 5,
    tags: ["Religion", "Société", "Pouvoir"],
    isPublished: true,
    isFeatured: false,
    relatedArticleIds: []
  },
  {
    id: "sn-hlth-002",
    slug: "mental-health-in-dakar",
    category: "Santé",
    type: "News",
    title: {
      fr: "La santé mentale à Dakar : Briser le tabou du mal-être urbain",
      en: "Mental Health in Dakar: Breaking the Taboo of Urban Malaise"
    },
    excerpt: {
      fr: "Avec l'urbanisation rapide, le stress social et la précarité, la consultation psychiatrique sort de l'ombre de la stigmatisation.",
      en: "With rapid urbanization, social stress, and precariousness, psychiatric consultation steps out of the shadow of stigma."
    },
    body: {
      fr: "Longtemps considérée comme une affliction mystique, la maladie mentale à Dakar est aujourd'hui reconnue par les jeunes générations comme une urgence de santé publique.\n\nLa pression économique implacable de la vie dakaroise, les exigences familiales et le chômage aggravent les cas de dépression et de burn-out. L'hôpital Fann, centre névralgique de la psychiatrie ouest-africaine, est débordé malgré les efforts du personnel.\n\nFaire face à cette épidémie silencieuse exige des politiques d'intégration à l'échelle des quartiers et une démystification de l'accompagnement psychologique dans les écoles.",
      en: "Long considered a mystical affliction, mental illness in Dakar is now recognized by younger generations as a public health emergency.\n\nThe relentless economic pressure of life in Dakar, family demands, and unemployment worsen cases of depression and burnout. Fann Hospital, the nerve center of West African psychiatry, is overwhelmed despite staff efforts.\n\nTackling this silent epidemic requires neighborhood-level integration policies and a demystification of psychological support in schools."
    },
    featuredImage: "https://images.unsplash.com/photo-1581056771107-24ca5f033842?q=80&w=800&h=800&fit=crop",
    author: "Dr. Ousmane Diop",
    date: "2025-08-05T15:30:00Z",
    readingTime: 4,
    tags: ["Santé Mentale", "Société", "Urbain"],
    isPublished: true,
    isFeatured: false,
    relatedArticleIds: []
  },
  {
    id: "sn-eco-002",
    slug: "msea-regional-gas-hub",
    category: "Économie",
    type: "Analysis",
    isPublished: true,
    isFeatured: false,
    title: {
      fr: "Sénégal, futur hub gazier d’Afrique de l’Ouest : Quels dividendes ?",
      en: "Senegal, Future Gas Hub of West Africa: What Dividends?"
    },
    excerpt: {
      fr: "L'exploitation des gisements de Grand Tortue Ahmeyim redéfinit la souveraineté énergétique régionale.",
      en: "Exploitation of Grand Tortue Ahmeyim reserves is redefining regional energy sovereignty."
    },
    body: {
      fr: "Le Sénégal s'apprête à entrer officiellement dans le cercle restreint des pays producteurs de pétrole et de gaz grâce aux projets majeurs de Sangomar et Grand Tortue Ahmeyim. Cette nouvelle ère hydrocarbure promet de transformer radicalement le paysage macroéconomique du pays.\n\nDans un contexte d'incertitude énergétique mondiale, le modèle sénégalais de répartition des dividendes, encadré par la loi sur le contenu local et le Fonds Souverain d'Investissements Securisés (FONSIS), suscite de grands espoirs stratégiques.",
      en: "Senegal is about to officially join the club of oil and gas producing nations thanks to the Sangomar and Grand Tortue Ahmeyim projects. This new hydrocarbon era promises to radically transform the macro-economic landscape of the country.\n\nIn a context of global energy uncertainty, the Senegalese model for distributing dividends, framed by the local content law and the Sovereign Wealth Fund (FONSIS), is raising immense strategic expectations."
    },
    featuredImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&fit=crop",
    author: "Aminata Sall",
    date: "2026-06-21T09:00:00Z",
    readingTime: 7,
    tags: ["Souveraineté", "Gaz", "Énergie", "Macro-économie"],
    perspectiveBrief: {
      whatHappened: {
        fr: "Le Sénégal lance l'exploitation des gisements énergétiques offshore.",
        en: "Senegal is commencing offshore energy reserves operations."
      },
      whyItMatters: {
        fr: "Cela peut stimuler l'indépendance de la sous-région face aux chocs d'approvisionnement.",
        en: "This could boost sub-regional independence in the face of supply shocks."
      },
      whatToWatchNext: {
        fr: "La répartition concrète des dividendes via la loi de contenu local.",
        en: "The practical distribution of returns under the local content framework."
      }
    },
    keyActors: [],
    timeline: [],
    relatedArticleIds: []
  },
  {
    id: "sn-cult-001",
    slug: "ebony-cinematic-dakar-renaissance",
    category: "Société",
    type: "News",
    isPublished: true,
    isFeatured: false,
    title: {
      fr: "Cinéma dakarois : L'effervescence créative d'une nouvelle vague artistique",
      en: "Dakar Cinema: The Creative Effervescence of a New Artistic Wave"
    },
    excerpt: {
      fr: "La capitale sénégalaise s'affirme comme l'épicentre du renouveau de l'audiovisuel ouest-africain.",
      en: "The Senegalese capital asserts itself as the epicenter of West African audiovisual renewal."
    },
    body: {
      fr: "De la Médina aux Almadies, de jeunes réalisateurs sénégalais bousculent les codes narratives traditionnels. Soutenu par le Fonds de Promotion de l'Industrie Cinématographique et Audiovisuelle (FOPICA), ce cinéma d'auteur s'exporte avec panache dans les festivals internationaux.",
      en: "From Medina to Almadies, young Senegalese directors are shaking up traditional narrative styles. Supported by the Film and Audiovisual Industry Promotion Fund (FOPICA), this independent cinema is successfully exported to international film festivals."
    },
    featuredImage: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=800&fit=crop",
    author: "Fatou Diop",
    date: "2026-06-20T16:00:00Z",
    readingTime: 5,
    tags: ["Cinéma", "Culture", "Art"],
    perspectiveBrief: {
      whatHappened: {
        fr: "Une nouvelle génération de cinéastes dakarois gagne du terrain dans les prix internationaux.",
        en: "A new generation of Dakar filmmakers gains ground in international honors."
      },
      whyItMatters: {
        fr: "Le rayonnement culturel du pays redéfinit son soft-power diplomatique regional.",
        en: "The cultural outreach of the country redefines its regional soft-power."
      },
      whatToWatchNext: {
        fr: "Les financements de FOPICA alloués aux projets indépendants d'Afrique francophone.",
        en: "The distribution of FOPICA grants allocated to French-speaking independent films."
      }
    },
    keyActors: [],
    timeline: [],
    relatedArticleIds: []
  },
  {
    id: "sn-spt-001",
    slug: "senegalese-wrestling-lamb-national-arena-economy",
    category: "Sports",
    type: "Analysis",
    isPublished: true,
    isFeatured: true,
    title: {
      fr: "Lutte Sénégalaise (Lamb) : Économie, sponsoring et ferveur populaire à l'Arène Nationale",
      en: "Senegalese Wrestling (Lamb): Economy, Sponsorship and Popular Fervor at the National Arena"
    },
    excerpt: {
      fr: "Analyse financière et sociologique des grands combats de lutte avec frappe qui mobilisent des centaines de millions de FCFA et des foules passionnées.",
      en: "Financial and sociological analysis of major strike wrestling clashes mobilizing hundreds of millions of FCFA and passionate crowds."
    },
    body: {
      fr: "À Dakar et à Pikine, la Lutte avec Frappe (Lamb) dépasse largement le cadre purement sportif. Rituels mystiques (bakk), contrats de sponsoring millionnaires et retransmissions télévisées sous haute tension font de l'Arène Nationale le théâtre des passions sénégalaises.\n\nCe dossier décrypte la structure financière des promoteurs de lutte, l'impact économique sur les banlieues dakaroises et l'émergence d'une nouvelle génération de lutteurs entrepreneurs.",
      en: "In Dakar and Pikine, Senegalese Wrestling (Lamb) goes far beyond pure sports. Mystical rituals (bakk), multi-million FCFA sponsorship contracts, and high-tension TV broadcasts make the National Arena the beating heart of Senegalese passions.\n\nThis report analyzes promoter financials, suburban economic impact, and the rise of a new generation of athlete-entrepreneurs."
    },
    featuredImage: "https://images.unsplash.com/photo-1517649763962-0c623266010b?q=80&w=800&fit=crop",
    author: "Mamadou Sylla",
    date: "2026-07-15T14:00:00Z",
    readingTime: 7,
    tags: ["Lutte", "Sports", "Lamb", "Dakar"],
    perspectiveBrief: {
      whatHappened: {
        fr: "L'Arène Nationale enregistre des affluences records pour les grands duels de la saison.",
        en: "The National Arena records record attendance for key seasonal wrestling duels."
      },
      whyItMatters: {
        fr: "La lutte constitue l'industrie culturelle et sportive la plus lucrative du pays.",
        en: "Wrestling stands as the country's most lucrative sports and cultural industry."
      },
      whatToWatchNext: {
        fr: "L'encadrement réglementaire des sponsors et la modernisation des infrastructures.",
        en: "Sponsorship regulatory oversight and infrastructure modernization."
      }
    },
    keyActors: [],
    timeline: [],
    relatedArticleIds: []
  },
  {
    id: "sn-spt-002",
    slug: "bal-basketball-senegal-dakar-orange-ball",
    category: "Sports",
    type: "Deep Dive",
    isPublished: true,
    isFeatured: false,
    title: {
      fr: "Basketball BAL & D1 Sénégal : Dakar, nouvelle capitale africaine de la balle orange",
      en: "BAL Basketball & Senegal D1: Dakar, the New African Orange Ball Capital"
    },
    excerpt: {
      fr: "Infrastructures de classe mondiale avec la Dakar Arena, recrutement continental et effervescence locale : le basket sénégalais est en pleine mutation.",
      en: "World-class infrastructure with Dakar Arena, continental recruitment, and local fervor: Senegalese basketball is undergoing a major transformation."
    },
    body: {
      fr: "Avec les phases de la Basketball Africa League (BAL) accueillies à la Dakar Arena de Diamniadio et la ferveur ininterrompue au Stadium Marius Ndiaye, le Sénégal s'affirme comme le pôle majeur du basketball sur le continent.\n\nDes clubs emblématiques comme la DUC, l'AS Douanes ou la Jeanne d'Arc structurent la formation des jeunes talents destinés aux ligues internationales.",
      en: "With Basketball Africa League (BAL) stages hosted at the Dakar Arena in Diamniadio and non-stop energy at Stadium Marius Ndiaye, Senegal establishes itself as a premier African basketball hub.\n\nIconic clubs like DUC, AS Douanes, and Jeanne d'Arc spearhead youth development pipelines for international leagues."
    },
    featuredImage: "https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=800&fit=crop",
    author: "Khoudia Touré",
    date: "2026-07-02T11:30:00Z",
    readingTime: 6,
    tags: ["Basketball", "BAL", "Sports", "Sénégal"],
    perspectiveBrief: {
      whatHappened: {
        fr: "La BAL consolide son ancrage dakarois avec des records d'audience.",
        en: "BAL consolidates its Dakar footprint with record viewership."
      },
      whyItMatters: {
        fr: "Le Sénégal devient une plaque tournante du recrutement et de l'événementiel sportif en Afrique.",
        en: "Senegal becomes a hub for African sports scouting and major event hosting."
      },
      whatToWatchNext: {
        fr: "Les investissements privés dans les académies de formation locales.",
        en: "Private investments into local basketball development academies."
      }
    },
    keyActors: [],
    timeline: [],
    relatedArticleIds: []
  },
  {
    id: "sn-spt-003",
    slug: "navetanes-local-football-dakar-neighborhood-hub",
    category: "Sports",
    type: "Explainer",
    isPublished: true,
    isFeatured: false,
    title: {
      fr: "Navétanes et Football Local : Au cœur du vivier sportif des quartiers dakarois",
      en: "Navetanes and Local Football: At the Heart of Dakar's Neighborhood Sports Hub"
    },
    excerpt: {
      fr: "Comment le championnat populaire des Navétanes façonne l'identité communautaire et alimente les sélections nationales du Sénégal.",
      en: "How the popular Navetanes championship shapes community identity and feeds Senegal's national sports teams."
    },
    body: {
      fr: "Durant l'hivernage, les zones ASC (Associations Sportives et Culturelles) vibrent au rythme des Navétanes. Plus qu'un simple tournoi de quartier, ce mouvement populaire réunit des centaines de milliers de supporters et sert de rampe de lancement pour les talents du football sénégalais.",
      en: "During the rainy season, local ASC zones buzz to the rhythm of Navetanes. Far more than a local tournament, this grassroots movement brings together hundreds of thousands of supporters and launches emerging Senegalese football talents."
    },
    featuredImage: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&fit=crop",
    author: "Fatou Diop",
    date: "2026-06-28T09:15:00Z",
    readingTime: 5,
    tags: ["Navétanes", "Football", "Sports", "Dakar"],
    perspectiveBrief: {
      whatHappened: {
        fr: "Les phases finales des Navétanes réunissent une mobilisation sans précédent.",
        en: "Navetanes final stages gather unprecedented community mobilization."
      },
      whyItMatters: {
        fr: "C'est le socle de la cohésion sociale et du vivier d'athlètes dakarois.",
        en: "It is the bedrock of social cohesion and Dakar's athletic talent pool."
      },
      whatToWatchNext: {
        fr: "La modernisation de la gestion des stades municipaux de quartier.",
        en: "Modernization of municipal neighborhood stadium management."
      }
    },
    keyActors: [],
    timeline: [],
    relatedArticleIds: []
  },
  {
    id: "sn-ppl-001",
    slug: "celebrites-influences-mode-dakar",
    category: "People",
    type: "News",
    isPublished: true,
    isFeatured: false,
    title: {
      fr: "Mode & Pop Culture : Les figures influentes qui redéfinissent la scène dakaroise",
      en: "Fashion & Pop Culture: The Influential Figures Redefining the Dakar Scene"
    },
    excerpt: {
      fr: "Créateurs de mode, influenceurs et créateurs de contenu : immersion au cœur de l'effervescence médiatique et créative de Dakar.",
      en: "Fashion designers, influencers, and content creators: an immersion into Dakar's vibrant media and creative scene."
    },
    body: {
      fr: "De la Dakar Fashion Week aux tapis rouges régionaux, les personnalités de la pop culture sénégalaise s'imposent à l'international. Portées par les réseaux sociaux et une nouvelle dynamique de sponsoring, ces figures charismatiques transforment la scène médiatique locale.",
      en: "From Dakar Fashion Week to regional red carpets, Senegalese pop culture figures are asserting themselves internationally. Powered by social media and new brand sponsorships, these charismatic icons are transforming the local media landscape."
    },
    featuredImage: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&fit=crop",
    author: "Fatou Diop",
    date: "2026-07-20T10:00:00Z",
    readingTime: 4,
    tags: ["People", "Mode", "Culture", "Dakar"],
    perspectiveBrief: {
      whatHappened: {
        fr: "Une nouvelle vague d'influenceurs créatifs dakarois séduit les grandes marques internationales.",
        en: "A new wave of Dakar creative influencers captivates major international brands."
      },
      whyItMatters: {
        fr: "Cela dynamise l'économie créative et le secteur de l'événementiel au Sénégal.",
        en: "This boosts the creative economy and event industry in Senegal."
      },
      whatToWatchNext: {
        fr: "Les nouvelles collaborations entre marques de luxe et créateurs locaux.",
        en: "New partnerships between luxury brands and local designers."
      }
    },
    keyActors: [],
    timeline: [],
    relatedArticleIds: []
  },
  {
    id: "sn-ppl-002",
    slug: "portraits-medias-personnalites-impact",
    category: "People",
    type: "Analysis",
    isPublished: true,
    isFeatured: false,
    title: {
      fr: "Grands Portraits : Les figures publiques et médias les plus suivies de l'année",
      en: "Major Portraits: The Year's Most Followed Public Figures and Media Icons"
    },
    excerpt: {
      fr: "Portraits exclusifs des personnalités publiques qui font la une de la presse et captivent des millions d'abonnés.",
      en: "Exclusive portraits of public figures making headlines and captivating millions of followers."
    },
    body: {
      fr: "Animateurs stars, journalistes vedettes et célébrités du spectacle : qui sont les leaders d'opinion qui façonnent la conversation publique au Sénégal ? Décryptage de leur impact culturel et de leur stratégie de communication.",
      en: "Star hosts, prime-time journalists, and entertainment icons: who are the opinion leaders shaping public conversation in Senegal? A look at their cultural impact and communication strategies."
    },
    featuredImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&fit=crop",
    author: "Mamadou Sylla",
    date: "2026-07-18T15:30:00Z",
    readingTime: 5,
    tags: ["People", "Médias", "Portraits", "Sénégal"],
    perspectiveBrief: {
      whatHappened: {
        fr: "Les personnalités médias digitales dépassent l'audience de la télévision traditionnelle.",
        en: "Digital media personalities overtake traditional TV audiences."
      },
      whyItMatters: {
        fr: "Le paysage de l'information et du divertissement se reconfigure rapidement.",
        en: "The news and entertainment landscape is reconfiguring rapidly."
      },
      whatToWatchNext: {
        fr: "La montée en puissance des podcasts et web-émissions indépendants.",
        en: "The rise of independent podcasts and web shows."
      }
    },
    keyActors: [],
    timeline: [],
    relatedArticleIds: []
  },
  {
    id: "sn-tch-002",
    slug: "startups-fintech-dakar-innovation",
    category: "Tech",
    type: "Deep Dive",
    isPublished: true,
    isFeatured: false,
    title: {
      fr: "Fintech & Startups : Dakar s'impose comme le hub technologique majeur d'Afrique de l'Ouest",
      en: "Fintech & Startups: Dakar Asserts Itself as West Africa's Major Tech Hub"
    },
    excerpt: {
      fr: "Inclusion financière, paiement mobile et levées de fonds : comment la tech dakaroise attire les investisseurs mondiaux.",
      en: "Financial inclusion, mobile payments, and fundraising: how Dakar tech is attracting global investors."
    },
    body: {
      fr: "Des solutions de paiement mobile aux plateformes d'agritech, le Sénégal enregistre une croissance remarquable de son écosystème startup. Grâce au Startup Act et aux incubateurs locaux, Dakar est devenu un pôle d'attraction pour les fonds de capital-risque.",
      en: "From mobile payment solutions to agritech platforms, Senegal is recording remarkable startup ecosystem growth. Thanks to the Startup Act and local incubators, Dakar has become a magnet for venture capital funds."
    },
    featuredImage: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=800&fit=crop",
    author: "Khoudia Touré",
    date: "2026-07-12T11:00:00Z",
    readingTime: 6,
    tags: ["Tech", "Fintech", "Innovation", "Dakar"],
    perspectiveBrief: {
      whatHappened: {
        fr: "Les levées de fonds des startups sénégalaises franchissent un nouveau palier.",
        en: "Senegalese startup fundraising reaches a new milestone."
      },
      whyItMatters: {
        fr: "La numérisation des services accélère la bancarisation de la population.",
        en: "Digitization of services accelerates financial inclusion."
      },
      whatToWatchNext: {
        fr: "L'expansion des pépites tech locales dans la sous-région UEMOA.",
        en: "Local tech stars expanding into the WAEMU sub-region."
      }
    },
    keyActors: [],
    timeline: [],
    relatedArticleIds: []
  }
];
