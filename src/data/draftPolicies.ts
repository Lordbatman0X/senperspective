/**
 * DRAFT POLICIES & CODE OF CONDUCT (PROJET SÉNÉGAL PERSPECTIVE GROUP)
 * Note: These policies are drafted to fully delimit the safe, authorized, and compliant use
 * of the website, mobile app, Abdel AI analyst, and reader dispatch channels.
 * STATUS: DRAFT / PENDING FINAL APPLICATION
 */

export interface PolicySection {
  id: string;
  titleFr: string;
  titleEn: string;
  summaryFr: string;
  summaryEn: string;
  articles: {
    num: string;
    titleFr: string;
    titleEn: string;
    contentFr: string;
    contentEn: string;
  }[];
}

export const DRAFT_SAFE_USE_POLICIES: PolicySection[] = [
  {
    id: 'cgu_safe_use',
    titleFr: "Conditions Générales d'Utilisation & Charte d'Usage Sécurisé (CGU)",
    titleEn: "Terms of Service & Safe Use Policy",
    summaryFr: "Règles encadrant l'accès au site, aux applications mobiles, à la messagerie interne et à la protection contre les usages malveillants.",
    summaryEn: "Rules governing access to the portal, mobile apps, direct messaging channels, and protection against malicious exploitation.",
    articles: [
      {
        num: 'Art. 1.1',
        titleFr: 'Usage Autorisé et Intégrité de la Plateforme',
        titleEn: 'Authorized Use & Platform Integrity',
        contentFr: "La plateforme senperspective.com et ses déclinaisons applicatives sont destinées à la consultation d'informations journalistiques et à l'analyse géopolitique du Sahel. Tout usage automatisé d'extraction massive (scraping non autorisé), tout déni de service (DDoS) ou tentative de contournement des mécanismes de sécurité constitue une violation grave sanctionnée par la loi sénégalaise relative à la cybercriminalité.",
        contentEn: "The senperspective.com portal and mobile clients are designed exclusively for accessing verified journalism and geopolitical analysis of the Sahel. Automated mass scraping, distributed denial-of-service (DDoS) attacks, or security bypass attempts violate platform terms and applicable cybercrime legislation."
      },
      {
        num: 'Art. 1.2',
        titleFr: 'Responsabilité de Compte et Canaux Directs',
        titleEn: 'Account Responsibility & Analyst Channels',
        contentFr: "L'utilisateur est le seul garant de la confidentialité de ses identifiants et clés de sécurité (Passkeys, OTP). Les messages transmis via le Canal des Analystes ou les commentaires publics ne doivent comporter aucun propos diffamatoire, appel à la violence, discours de haine, ou usurpation d'identité d'acteurs institutionnels.",
        contentEn: "Users maintain sole responsibility for safeguarding their account credentials and passkeys. Transmissions submitted via Direct Analyst Channels or public declaration feeds must refrain from hate speech, defamation, incitement to violence, or impersonation of public officials."
      },
      {
        num: 'Art. 1.3',
        titleFr: "Propriété Intellectuelle et Droits d'Auteur",
        titleEn: 'Intellectual Property & Archival Rights',
        contentFr: "L'ensemble des dépêches, infographies, cartographies et rapports d'analyse publiés sur Perspective Group sont protégés par le droit d'auteur. Toute reproduction ou citation doit obligatoirement mentionner la source 'Perspective Group - senperspective.com'.",
        contentEn: "All dispatch briefs, cartographic visualizers, and research reports hosted on Perspective Group remain strictly copyrighted. Reproduction or citation requires explicit credit attribution to 'Perspective Group - senperspective.com'."
      }
    ]
  },
  {
    id: 'privacy_geolocation',
    titleFr: "Politique de Confidentialité, RGPD & Données de Géolocalisation",
    titleEn: "Privacy Policy, GDPR & Location Telemetry Governance",
    summaryFr: "Cadre strict régissant la collecte des données de trafic, la géolocalisation régionale et les droits des lecteurs.",
    summaryEn: "Strict governance for traffic telemetry collection, regional geolocation, and reader data subject rights.",
    articles: [
      {
        num: 'Art. 2.1',
        titleFr: 'Consentement Préalable à la Géolocalisation',
        titleEn: 'Explicit Prior Consent for Geolocation Telemetry',
        contentFr: "Conformément au RGPD et aux normes de la Commission des Données Personnelles (CDP du Sénégal), aucune donnée de localisation basée sur le fuseau horaire ou la région n'est associée aux métriques de trafic sans l'accord préalable et explicite de l'utilisateur via le bandeau de consentement.",
        contentEn: "In full alignment with GDPR and the Senegalese Personal Data Protection Commission (CDP), no timezone or regional location data is attached to audience analytics without explicit, prior user consent obtained via the privacy preferences center."
      },
      {
        num: 'Art. 2.2',
        titleFr: 'Droit d’Accès, d’Exportation et de Suppression (Right to be Forgotten)',
        titleEn: 'Rights of Access, Export, and Data Erasure',
        contentFr: "Tout lecteur dispose à tout moment du droit d'exporter ses sessions archivées, l'historique de ses déclarations et ses préférences de consentement, ou de demander la suppression définitive de son profil Firestore via l'Espace Lecteur ou l'adresse dpo@senperspective.com.",
        contentEn: "Readers reserve the right at all times to inspect, export, or permanently erase their archived session records, direct messaging history, and profile documents stored within Firestore databases."
      },
      {
        num: 'Art. 2.3',
        titleFr: 'Sécurité du Stockage et Chiffrement',
        titleEn: 'Secure Cloud Storage & Operational Boundaries',
        contentFr: "Les jetons d'authentification et clés API sensibles ne sont jamais exposés côté client. Les données d'archives de trafic sont isolées au sein des règles de sécurité Firebase Firestore et ne sont jamais revendues à des tiers.",
        contentEn: "Sensitive API secrets and authorization bearer tokens are exclusively processed within secure server environments. Telemetry archive records remain locked under strict Firestore security rules and are never commercialized to external brokers."
      }
    ]
  },
  {
    id: 'ai_editorial_policy',
    titleFr: "Charte de l'Assistant IA Abdel & Encadrement Éditorial",
    titleEn: "Abdel AI Assistant Guidelines & Editorial Disclaimer",
    summaryFr: "Procédures encadrant l'utilisation des fonctionnalités IA, la prévention de la désinformation et la vérification des sources.",
    summaryEn: "Guidelines governing AI synthesis tools, misinformation safeguards, and source verification standards.",
    articles: [
      {
        num: 'Art. 3.1',
        titleFr: 'Incapacité Décisionnelle et Rôle d’Assistance',
        titleEn: 'Analytical Guidance & Non-Binding Assistance',
        contentFr: "L'assistant Abdel IA fournit une synthèse automatisée basée sur le corpus documentaire de senperspective.com. Les réponses de l'IA sont données à titre indicatif et ne remplacent en aucun cas la vérification par le bureau des journalistes et éditeurs de la rédaction.",
        contentEn: "The Abdel AI assistant delivers automated intelligence synthesis derived from the publication archive. AI recommendations serve strictly as analytical guidance and do not replace editorial validation by professional journalists."
      },
      {
        num: 'Art. 3.2',
        titleFr: 'Modération et Prévention des Abus dans les Chats',
        titleEn: 'Messaging Moderation & Abuse Prevention',
        contentFr: "La rédaction se réserve le droit de restreindre temporairement l'accès aux canaux interactifs en cas de tentative de manipulation des modèles IA (jailbreaking), de spams répétés ou de soumission de contenus contraires aux lois en vigueur.",
        contentEn: "Editorial administration reserves the right to restrict access to direct messaging modules if systematic prompt manipulation, spamming, or unlawful content submissions are detected."
      }
    ]
  }
];
