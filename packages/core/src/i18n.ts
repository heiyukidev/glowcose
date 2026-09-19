import { get, reduce } from "lodash";

/**
 * French is the product's source and default locale. Add any future locale
 * here, while keeping French copy as the reference for product wording.
 */
export const DEFAULT_LOCALE = "fr";
export const SUPPORTED_LOCALES = [DEFAULT_LOCALE] as const;

const FRENCH_MESSAGES = {
  "brand.name": "Gluciel",
  "brand.disclaimer":
    "Gluciel n’est pas un dispositif médical et ne remplace pas un avis médical.",
  "metadata.title": "Gluciel — carnet de glycémie",
  "metadata.description":
    "Carnet personnel de glycémie. Gluciel n’est pas un dispositif médical et ne remplace pas un avis médical.",
  "onboarding.lead":
    "Gluciel prépare les couleurs et les seuils adaptés. Vous pourrez les modifier plus tard.",
  "notFound.product": "Ce chemin n’existe pas dans Gluciel.",
  "notFound.page": "Cette page n’existe pas.",
  "notFound.backToJournal": "Retour au carnet",
  "navigation.back": "Retour",
  "home.today": "Aujourd’hui",
  "home.personalTracking": "suivi personnel",
  "home.sharedTracking": "carnet partagé",
  "share.title": "Partager le carnet",
  "share.leadSolo":
    "Ce carnet suit une personne. Un proche peut ajouter des mesures avec vous.",
  "share.leadShared":
    "{{count}} personnes peuvent ajouter des mesures sur ce carnet.",
  "share.createCode": "Créer un code d’invitation",
  "share.newCode": "Nouveau code",
  "share.copyLink": "Copier le lien",
  "share.share": "Envoyer le code",
  "share.copied": "Lien copié",
  "share.codeHint":
    "Le code expire dans 7 jours. Il ne peut servir qu’une fois.",
  "share.joinTitle": "Rejoindre un carnet",
  "share.joinLead":
    "Entrez le code reçu. Vos mesures actuelles ne seront pas mélangées.",
  "share.joinCta": "Rejoindre",
  "share.joinPlaceholder": "Code",
  "share.needAccount":
    "Connectez-vous pour partager ou rejoindre un carnet.",
  "share.joinSuccess": "Vous suivez maintenant le même carnet.",
  "rejoindre.title": "Rejoindre le carnet",
  "rejoindre.missing": "Il manque un code d’invitation.",
  "rejoindre.signingIn": "Connectez-vous pour rejoindre ce carnet.",
  "rejoindre.joining": "Inscription au carnet…",
  "connexion.lead":
    "Un carnet suit une personne. Vous pourrez inviter un proche ensuite.",
  "home.addReading": "Ajouter une glycémie",
  "home.noReadingToday": "Pas encore de mesure aujourd’hui.",
  "home.inRangeToday": "{{inRange}} / {{total}} dans la cible aujourd’hui.",
  "home.emptyTitle": "Rien pour aujourd’hui",
  "home.emptyBody":
    "Ajoutez la première glycémie du jour — cela prend moins de 10 secondes.",
  "history.title": "Historique",
  "history.emptyTitle": "Aucune glycémie",
  "history.emptyBody": "Les mesures apparaîtront ici, regroupées par jour.",
  "graph.title": "Graphique",
  "graph.empty": "Pas encore de mesure sur cette période.",
  "graph.trend": "Tendance",
  "graph.reference":
    "Lignes de référence : cible à jeun (vert) et après le repas à 2 h (orange).",
  "graph.legend": "Trait vert : cible à jeun · trait orange : après le repas à 2 h.",
  "settings.title": "Réglages",
  "settings.lead":
    "Unités d’affichage et seuils (mg/dL). Les valeurs restent stockées en mg/dL.",
  "add.title": "Nouvelle glycémie",
  "add.lead": "Valeur, contexte, enregistrer.",
  "edit.title": "Modifier",
  "edit.lead": "Ajustez la mesure ou archivez-la.",
  "edit.missing": "Mesure introuvable. Elle a peut-être été archivée.",
  "form.invalidReading": "Entrez une glycémie valide.",
  "form.saveUnavailable": "Enregistrement impossible pour le moment.",
  "form.archive": "Archiver",
  "form.archivePrompt": "Archiver cette mesure ?",
  "form.cancel": "Annuler",
} as const;

const MESSAGES = {
  fr: FRENCH_MESSAGES,
} as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type TranslationKey = keyof typeof FRENCH_MESSAGES;
export type TranslationParams = Record<string, string | number>;

export function t(
  key: TranslationKey,
  params: TranslationParams = {},
  locale: Locale = DEFAULT_LOCALE,
): string {
  const message: string =
    get(MESSAGES, [locale, key]) ??
    get(MESSAGES, [DEFAULT_LOCALE, key]) ??
    key;

  return reduce<TranslationParams, string>(
    params,
    (translated: string, value, name) =>
      translated.replaceAll(`{{${name}}}`, String(value)),
    message,
  );
}
