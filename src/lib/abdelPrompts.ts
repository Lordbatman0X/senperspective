import { Article } from "../types";

export interface AbdelPromptContext {
  sectionLabel: { fr: string; en: string };
  locationType: "article" | "category" | "sports" | "search" | "saved" | "home";
  articleContextTitle?: { fr: string; en: string };
  greeting: { fr: string; en: string };
  badgeIcon?: string;
  prompts: { fr: string[]; en: string[] };
}

export function getAbdelContextualPrompts(
  pathname: string,
  contextArticle?: Article,
  customAdminPrompts?: { fr?: string[]; en?: string[] }
): AbdelPromptContext {
  // 0. Admin Console (/admin)
  if (pathname.startsWith("/admin")) {
    return {
      sectionLabel: {
        fr: "Espace Éditorial & Administration",
        en: "Editorial Desk & Admin Console",
      },
      locationType: "category",
      greeting: {
        fr: "Bonjour ! Vous êtes sur le Portail d'Administration. Je peux vous assister dans la vérification de la charte éditoriale, la configuration RSS ou l'optimisation des requêtes d'IA.",
        en: "Hello! You are in the Admin Console. I can assist you with editorial policy verification, RSS automation settings, or AI prompt optimization.",
      },
      prompts: {
        fr: [
          "Comment fonctionnent le tri automatique et la logique Dual-Engine ?",
          "Rappel des règles de style et de la charte de modération du journal",
          "Comment optimiser les automatisations RSS pour les dépêches ?",
          "Quelles sont les consignes éditoriales pour la Rédaction Perspective ?",
        ],
        en: [
          "How does the automated triage and Dual-Engine AI workflow operate?",
          "Review the editorial style rules and reader moderation guidelines",
          "How can we optimize RSS automation settings for news feeds?",
          "What are the core editorial instructions for Perspective Group?",
        ],
      },
    };
  }

  // 1. In an Article Page (/article/:id or contextArticle is defined)
  if (contextArticle || pathname.startsWith("/article/")) {
    const titleFr = contextArticle?.title?.fr || contextArticle?.title?.en || "cet article";
    const titleEn = contextArticle?.title?.en || contextArticle?.title?.fr || "this article";
    const shortTitleFr = titleFr.length > 42 ? `${titleFr.slice(0, 40)}…` : titleFr;
    const shortTitleEn = titleEn.length > 42 ? `${titleEn.slice(0, 40)}…` : titleEn;
    const category = contextArticle?.category || "Dossier";

    const frPrompts = [
      `Fais-moi une synthèse claire en 3 points de « ${shortTitleFr} »`,
      "Quels sont les enjeux géopolitiques et économiques de ce sujet ?",
      "Qui sont les acteurs clés mentionnés et leurs motivations ?",
      "Quel est l'impact concret de cette situation pour les citoyens ?",
      "Explique-moi le contexte historique en termes simples",
      "Quelles sont les perspectives et scénarios d'évolution ?"
    ];

    const enPrompts = [
      `Give me a clear 3-point summary of "${shortTitleEn}"`,
      "What are the key geopolitical and economic stakes here?",
      "Who are the key players mentioned and what drives them?",
      "What is the real-world impact of this situation on citizens?",
      "Explain the historical background in straightforward terms",
      "What are the most likely scenarios and future outlooks?"
    ];

    return {
      sectionLabel: {
        fr: `Article : ${shortTitleFr}`,
        en: `Article: ${shortTitleEn}`,
      },
      locationType: "article",
      articleContextTitle: { fr: titleFr, en: titleEn },
      greeting: {
        fr: `Bonjour ! Je vois que vous lisez **« ${titleFr} »** (${category}). C'est une actualité marquante. Que souhaitez-vous approfondir ensemble ?`,
        en: `Hello! I see you're reading **"${titleEn}"** (${category}). This is a key story. What would you like to unpack together?`,
      },
      prompts: {
        fr: frPrompts,
        en: enPrompts,
      },
    };
  }

  // 2. Category Pages (/category/:categoryId)
  if (pathname.startsWith("/category/")) {
    const categorySegment = pathname.replace("/category/", "").toLowerCase().trim();

    // SPORTS CATEGORY
    if (categorySegment.includes("sport") || categorySegment.includes("arene") || categorySegment.includes("larene")) {
      return {
        sectionLabel: {
          fr: "Rubrique Sport & L'Arène",
          en: "Sports & Arena Section",
        },
        locationType: "sports",
        greeting: {
          fr: "Salut ! Vous explorez la rubrique Sports & L'Arène. Entre ferveur du Lamb, football et exploits athlétiques, quel match ou analyse vous intéresse ?",
          en: "Welcome! You're checking out Sports & The Arena. Between Senegalese Lamb wrestling, football, and athletic feats, what matchup or story can I break down for you?",
        },
        prompts: {
          fr: [
            "Quelles sont les dernières actualités sportives marquantes au Sénégal ?",
            "Décrypte-moi la sociologie et l'économie passionnante de la lutte sénégalaise",
            "Quels sont les jeunes talents et grands champions à suivre absolument ?",
            "Fais-moi un bilan des performances sénégalaises sur la scène internationale",
          ],
          en: [
            "What are the major recent sporting developments in Senegal?",
            "Break down the fascinating sociology and economics of Senegalese wrestling",
            "Which rising talents and top champions should we keep an eye on?",
            "Give me an overview of Senegalese athletes competing internationally",
          ],
        },
      };
    }

    // POLITICS CATEGORY
    if (categorySegment.includes("politique") || categorySegment.includes("politic")) {
      return {
        sectionLabel: {
          fr: "Rubrique Politique & Gouvernance",
          en: "Politics & Governance Beat",
        },
        locationType: "category",
        greeting: {
          fr: "Bonjour ! Vous parcourez nos analyses politiques et institutionnelles. Quel débat ou enjeu public souhaitez-vous décrypter ?",
          en: "Hello! You're browsing our political coverage and governance analyses. Which reform or public debate would you like to explore?",
        },
        prompts: {
          fr: [
            "Quelles sont les grandes dynamiques politiques actuelles au Sénégal ?",
            "Peux-tu m'expliquer les récents arbitrages et réformes institutionnelles ?",
            "Quels sont les grands sujets qui animent l'Assemblée et le débat citoyen ?",
            "Comment s'articulent les relations entre État, opposition et société civile ?",
          ],
          en: [
            "What are the main political currents shaping Senegal right now?",
            "Can you explain recent institutional reforms and policy shifts?",
            "What topics are sparking debate in the National Assembly and public forum?",
            "How are dynamics evolving between the administration, opposition, and civil society?",
          ],
        },
      };
    }

    // ECONOMY CATEGORY
    if (categorySegment.includes("economie") || categorySegment.includes("economy")) {
      return {
        sectionLabel: {
          fr: "Rubrique Économie & Finances",
          en: "Economy & Markets Beat",
        },
        locationType: "category",
        greeting: {
          fr: "Ravi de vous retrouver ! Vous êtes dans la section Économie. Marchés, investissements, pouvoir d'achat : sur quoi voulez-vous un éclairage ?",
          en: "Great to see you! You're in our Economy section. Markets, investments, inflation, or industry: what would you like me to clarify?",
        },
        prompts: {
          fr: [
            "Quelles sont les tendances clés de l'économie sénégalaise et de l'UEMOA ?",
            "Comment évoluent le pouvoir d'achat, l'inflation et les grands projets ?",
            "Quels secteurs économiques créent le plus d'opportunités pour la jeunesse ?",
            "Quels sont les défis majeurs pour les PME et la souveraineté économique ?",
          ],
          en: [
            "What are the primary economic trends across Senegal and the WAEMU region?",
            "How are inflation, purchasing power, and major infrastructure projects tracking?",
            "Which economic sectors offer the biggest opportunities for young entrepreneurs?",
            "What are the central challenges facing local businesses and economic sovereignty?",
          ],
        },
      };
    }

    // INTERNATIONAL CATEGORY
    if (categorySegment.includes("international") || categorySegment.includes("world") || categorySegment.includes("monde")) {
      return {
        sectionLabel: {
          fr: "Rubrique International & Géopolitique",
          en: "International & Geopolitics",
        },
        locationType: "category",
        greeting: {
          fr: "Bonjour ! Vous consultez nos dossiers internationaux et géopolitiques. Quelles relations diplomatiques ou crises mondiales voulez-vous analyser ?",
          en: "Hello! You're reading our international and geopolitical dispatches. Which diplomatic developments or global crises should we dive into?",
        },
        prompts: {
          fr: [
            "Quelle est la posture diplomatique du Sénégal sur les grands dossiers mondiaux ?",
            "Fais-moi un point clair sur la situation géopolitique en Afrique de l'Ouest",
            "Quels sont les accords stratégiques et partenariats internationaux récents ?",
            "Décrypte les équilibres entre grandes puissances et pays du Sud global",
          ],
          en: [
            "What is Senegal's diplomatic stance on key global affairs?",
            "Give me a clear overview of the geopolitical dynamics in West Africa",
            "What strategic alliances and bilateral agreements are currently unfolding?",
            "Analyze the shifting balance between major global powers and the Global South",
          ],
        },
      };
    }

    // CULTURE CATEGORY
    if (categorySegment.includes("culture") || categorySegment.includes("art")) {
      return {
        sectionLabel: {
          fr: "Rubrique Culture & Société",
          en: "Culture & Society Beat",
        },
        locationType: "category",
        greeting: {
          fr: "Bienvenue dans l'espace Culture ! Littérature, cinéma, musique et patrimoine : qu'aimeriez-vous découvrir ou approfondir ?",
          en: "Welcome to our Culture section! Literature, cinema, music, and heritage: what would you like to discover or discuss?",
        },
        prompts: {
          fr: [
            "Quelles sont les œuvres artistiques et sorties culturelles marquantes du moment ?",
            "Comment la scène culturelle sénégalaise rayonne-t-elle à l'international ?",
            "Quels sont les événements, festivals et lieux culturels à ne pas rater ?",
            "Parle-moi des figures littéraires et artistiques incontournables",
          ],
          en: [
            "What are the standout artistic releases and cultural milestones right now?",
            "How is the Senegalese contemporary art and literature scene resonating abroad?",
            "Which upcoming festivals, exhibitions, and cultural hubs should we explore?",
            "Tell me about iconic literary and creative voices making history",
          ],
        },
      };
    }

    // SOCIETY CATEGORY
    if (categorySegment.includes("societe") || categorySegment.includes("society")) {
      return {
        sectionLabel: {
          fr: "Rubrique Société & Débats",
          en: "Society & Community Beat",
        },
        locationType: "category",
        greeting: {
          fr: "Bonjour ! Vous parcourez les récits et débats de société. Quel sujet citoyen ou évolution sociale vous interpelle ?",
          en: "Hello! You're reading our societal features and community debates. Which civic topic or social shift caught your attention?",
        },
        prompts: {
          fr: [
            "Quels sont les grands débats de société qui traversent le pays en ce moment ?",
            "Comment la jeunesse réinvente-t-elle l'engagement citoyen et communautaire ?",
            "Quels sont les défis éducatifs, environnementaux et urbains prioritaires ?",
            "Décrypte les initiatives positives qui transforment le quotidien local",
          ],
          en: [
            "What societal discussions are currently animating the country?",
            "How are youth movements reshaping civic engagement and community life?",
            "What are the top priorities around education, environment, and urban growth?",
            "Highlight community-driven initiatives making a tangible difference",
          ],
        },
      };
    }

    // TECHNOLOGY CATEGORY
    if (categorySegment.includes("tech") || categorySegment.includes("innovation")) {
      return {
        sectionLabel: {
          fr: "Rubrique Innovation & Numérique",
          en: "Innovation & Digital Beat",
        },
        locationType: "category",
        greeting: {
          fr: "Salut ! Vous explorez notre veille sur l'innovation et le numérique. Startups, intelligence artificielle, fintech : que souhaitez-vous explorer ?",
          en: "Hi! You're checking out our Innovation & Tech desk. Startups, AI, fintech, and digital transformation: where should we begin?",
        },
        prompts: {
          fr: [
            "Comment grandit l'écosystème tech et startup au Sénégal et en Afrique de l'Ouest ?",
            "Quels sont les usages concrets et prometteurs de l'IA dans la région ?",
            "Quelles innovations révolutionnent les services bancaires, la santé ou l'énergie ?",
            "Quels sont les enjeux majeurs de souveraineté numérique et de cybersécurité ?",
          ],
          en: [
            "How is the tech ecosystem and startup hub evolving in Senegal and West Africa?",
            "What are the most promising real-world applications of AI in the region?",
            "Which innovations are disrupting fintech, healthtech, and green energy?",
            "What are the central challenges around digital sovereignty and cybersecurity?",
          ],
        },
      };
    }
  }

  // 3. L'Arène Page (/larene or /arene)
  if (pathname.startsWith("/larene") || pathname.startsWith("/arene")) {
    return {
      sectionLabel: {
        fr: "L'Arène & Lamb Sénégalais",
        en: "The Arena & Senegalese Lamb",
      },
      locationType: "sports",
      greeting: {
        fr: "Bienvenue dans L'Arène ! Le Lamb sénégalais est un art, un sport et une passion nationale. Sur quel combat, lutteur ou écurie voulez-vous mon regard ?",
        en: "Welcome to The Arena! Senegalese wrestling is a cultural art, a sport, and a nationwide passion. Which fight, wrestler, or stable should we discuss?",
      },
      prompts: {
        fr: [
          "Décrypte-moi la dimension culturelle, rituelle et sportive de la lutte sénégalaise",
          "Quels sont les grands combats, rivalités historiques et affiches à venir ?",
          "Qui sont les figures légendaires et les jeunes pépites de l'arène ?",
          "Comment fonctionne l'économie des promoteurs et la préparation des champions ?",
        ],
        en: [
          "Explain the cultural, spiritual, and athletic dimensions of Senegalese Lamb",
          "What are the most iconic rivalries, historic showdowns, and upcoming clashes?",
          "Who are the legendary icons and the brightest rising stars in the sand?",
          "How do promoter business models and champions' training camps operate?",
        ],
      },
    };
  }

  // 4. Search Page (/search)
  if (pathname.startsWith("/search")) {
    return {
      sectionLabel: {
        fr: "Recherche & Archives du Journal",
        en: "Search & Journal Archives",
      },
      locationType: "search",
      greeting: {
        fr: "Vous effectuez des recherches dans les archives du journal. Dites-moi ce que vous cherchez, et je vous aide à faire la synthèse des dossiers correspondants !",
        en: "You're searching through the journal's archives. Let me know what you're looking for, and I'll help you synthesize related investigations!",
      },
      prompts: {
        fr: [
          "Aide-moi à explorer et synthétiser les articles liés à ma recherche",
          "Quels sont les dossiers les plus approfondis sur ce sujet dans le journal ?",
          "Fais-moi un récapitulatif des différentes prises de position publiées",
          "Recommande-moi les articles incontournables à lire en priorité",
        ],
        en: [
          "Help me explore and synthesize articles matching my research",
          "What are the most comprehensive investigations published on this topic?",
          "Give me an executive summary of the diverse editorial angles covered",
          "Recommend the must-read articles to start with",
        ],
      },
    };
  }

  // 5. Saved Page (/saved)
  if (pathname.startsWith("/saved")) {
    return {
      sectionLabel: {
        fr: "Votre Bibliothèque de Lecture",
        en: "Your Reading Library",
      },
      locationType: "saved",
      greeting: {
        fr: "Bonjour ! Vous êtes dans vos articles enregistrés. C'est une belle sélection ! Souhaitez-vous une synthèse croisée ou des conseils d'ordre de lecture ?",
        en: "Hello! You're looking at your saved articles. That's a great reading list! Would you like a cross-topic synthesis or a recommended reading order?",
      },
      prompts: {
        fr: [
          "Fais-moi une synthèse globale et croisée de mes articles enregistrés",
          "Quels liens logiques et thématiques unissent les articles de ma sélection ?",
          "Quels sont les principaux enseignements et idées fortes à en retenir ?",
          "Propose-moi un ordre de lecture idéal pour optimiser ma compréhension",
        ],
        en: [
          "Give me an executive cross-topic synthesis of my bookmarked stories",
          "What thematic and analytical threads connect my saved reading list?",
          "What are the key takeaways and actionable insights from these pieces?",
          "Suggest an optimal reading order to maximize my understanding",
        ],
      },
    };
  }

  // 6. Homepage (Default / General)
  const cleanAdminFr = customAdminPrompts?.fr?.filter(
    p => !p.toLowerCase().includes("article en cours") && !p.toLowerCase().includes("cet article")
  ) || [];

  const cleanAdminEn = customAdminPrompts?.en?.filter(
    p => !p.toLowerCase().includes("current article") && !p.toLowerCase().includes("this article")
  ) || [];

  const defaultFr = cleanAdminFr.length > 0
    ? cleanAdminFr
    : [
        "Quelles sont les actualités majeures aujourd'hui sur Perspective ?",
        "Résumer les faits marquants en Afrique de l'Ouest",
        "Quels dossiers géopolitiques et économiques suivre actuellement ?",
        "Recommande-moi une grande enquête ou un décryptage du journal",
        "Explique-moi les grands enjeux du moment de manière accessible",
      ];

  const defaultEn = cleanAdminEn.length > 0
    ? cleanAdminEn
    : [
        "What are today's major headlines on Perspective?",
        "Summarize key West African developments",
        "Which geopolitical & economic topics should I follow?",
        "Recommend a major investigation or editorial breakdown",
        "Explain current regional challenges simply",
      ];

  return {
    sectionLabel: {
      fr: "La Une & Actualités du Journal",
      en: "Front Page & Top Stories",
    },
    locationType: "home",
    greeting: {
      fr: "Bonjour ! Je suis **Abdel**, votre compagnon d'information au sein du journal *Perspective Group*. Je suis là pour vous faire un briefing, répondre à vos questions ou décrypter l'actualité avec vous. Que souhaitez-vous savoir ?",
      en: "Hello! I am **Abdel**, your news companion at *Perspective Group*. I'm here to brief you on today's headlines, answer your questions, and analyze stories with you. What would you like to explore?",
    },
    prompts: {
      fr: defaultFr,
      en: defaultEn,
    },
  };
}
