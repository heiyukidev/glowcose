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
  "meal.photos": "Photos",
  "photo.close": "Fermer",
  "photo.previous": "Photo précédente",
  "photo.next": "Photo suivante",
  "photo.open": "Voir les photos",
  "photo.position": "{{current}} / {{total}}",
  "meal.addBefore": "Ajouter avant le repas",
  "meal.addAfter": "Ajouter après le repas",
  "meal.emptyValue": "—",
  "rappel.schedule": "Rappeler dans 2 h",
  "rappel.scheduleShort": "Dans 2 h",
  "rappel.cancel": "Annuler",
  "rappel.scheduled": "Rappel {{time}}",
  "rappel.toastTitle": "Avant enregistré",
  "rappel.toastBody": "Rappeler pour l’après-repas ?",
  "rappel.notificationTitle": "Gluciel",
  "rappel.permissionTitle": "Notifications",
  "rappel.permissionBody":
    "Autorisez les notifications pour recevoir le rappel dans 2 heures.",
  "rappel.permissionOpenSettings": "Ouvrir Réglages",
  "rappel.permissionLater": "Plus tard",
  "history.title": "Historique",
  "history.emptyTitle": "Aucune glycémie",
  "history.emptyBody": "Les mesures apparaîtront ici, regroupées par jour.",
  "history.loadMore": "Mesures plus anciennes",
  "graph.title": "Graphique",
  "graph.days7": "7 jours",
  "graph.days30": "30 jours",
  "graph.empty": "Pas encore de mesure sur cette période.",
  "graph.trend": "Tendance",
  "graph.reference":
    "Lignes de référence : cible à jeun (vert) et après le repas à 2 h (orange).",
  "graph.legend": "Trait vert : cible à jeun · trait orange : après le repas à 2 h.",
  "settings.title": "Réglages",
  "settings.lead":
    "Unités d’affichage et seuils (mg/dL). Les valeurs restent stockées en mg/dL.",
  "import.title": "Importer des mesures",
  "import.lead":
    "CSV de glycémie capillaire. Vérifiez la correspondance des colonnes. Les doublons déjà dans le carnet sont ignorés.",
  "import.choose": "Choisir un fichier CSV",
  "import.confirm": "Ajouter {{count}} mesures",
  "import.reset": "Annuler",
  "import.restoreGuess": "Rétablir la suggestion",
  "import.previewAdd": "{{count}} mesures à ajouter",
  "import.previewSkip": "{{count}} déjà présentes",
  "import.previewReject": "{{count}} lignes ignorées",
  "import.success": "{{count}} mesures ajoutées",
  "import.example": "Exemple de mesure",
  "import.exampleEmpty":
    "Exemple illisible avec cette correspondance. Il manque la date, l’heure ou une glycémie.",
  "import.exampleNoNote": "Sans note",
  "import.contextMealType": "type de repas",
  "import.contextClock": "heure du jour",
  "import.ignore": "Laisser vide",
  "import.missing": "Champs manquants : {{fields}}.",
  "import.field.date": "Date",
  "import.field.time": "Heure",
  "import.field.value": "Glycémie",
  "import.field.unit": "Unité",
  "import.field.context": "Contexte (texte)",
  "import.field.mealType": "Type de repas (0/1/2)",
  "import.field.postPrandial": "Post-prandial",
  "import.field.note": "Note",
  "import.error.empty": "Fichier vide.",
  "import.error.notGlucose":
    "Ce fichier n’est pas un export de glycémie capillaire.",
  "import.error.cgm":
    "Ce fichier ressemble à du glucose en continu. Gluciel n’importe que les glycémies capillaires.",
  "import.error.noRows":
    "Aucune glycémie capillaire lisible dans ce fichier.",
  "import.error.tooLarge": "Ce fichier contient trop de lignes.",
  "import.error.failed": "Import impossible pour le moment.",
  "add.title": "Nouvelle glycémie",
  "add.lead": "Valeur, contexte, enregistrer.",
  "edit.title": "Modifier",
  "edit.lead": "Ajustez la mesure ou archivez-la.",
  "edit.missing": "Mesure introuvable. Elle a peut-être été archivée.",
  "form.invalidReading": "Entrez une valeur entre {{min}} et {{max}}.",
  "form.invalidTime": "Indiquez le jour et l’heure de la mesure.",
  "form.save": "Enregistrer",
  "form.saving": "Enregistrement…",
  "form.saved": "Glycémie enregistrée",
  "form.updated": "Mesure mise à jour",
  "form.saveUnavailable": "Enregistrement impossible pour le moment.",
  "form.archive": "Archiver",
  "form.archiving": "Archivage…",
  "form.archived": "Mesure archivée",
  "form.archivePrompt": "Archiver cette mesure ?",
  "form.cancel": "Annuler",
  "form.photoUnreadable": "Impossible de lire cette photo.",
  "form.noteCount": "{{count}} / {{max}}",
  "settings.bandOrder":
    "Hypo, vert puis orange, chacun entre 40 et 400 mg/dL.",
  "loading.journal": "Chargement du carnet…",
  "error.title": "Le carnet n’a pas pu s’afficher.",
  "error.body":
    "La connexion a été interrompue. Les mesures déjà enregistrées sont conservées.",
  "error.retry": "Réessayer",
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
