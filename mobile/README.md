# Application Expo Gluciel

Application mobile du carnet personnel de glycémie Gluciel. Lancez-la depuis
ce dossier :

```sh
npm install
npx expo start
```

Consultez le [README](../README.md) à la racine pour les variables
d’environnement, le mode démo et le backend Convex partagé.

## TestFlight (build et envoi EAS)

Un **compte Expo ne suffit pas** pour TestFlight. Il faut aussi :

1. Le **programme Apple Developer** (payant, actuellement 99 $/an)
2. Une fiche **App Store Connect** dont le bundle ID est
   `com.khaledromdhane.glowcose`
3. Les contrats développeur Apple signés dans App Store Connect

Le projet EAS est déjà lié dans `app.json`. Les identifiants Apple et App Store
Connect restent propres au compte de Khaled : ne les inventez pas.

### Configuration initiale (depuis `mobile/`)

```sh
cd mobile
npm install

# CLI EAS
npm i -g eas-cli
# ou utilisez npx sans installation globale :
# npx eas-cli --version

eas login
# même compte Expo que Khaled

# crée extra.eas.projectId dans app.json — à committer
eas init
# et/ou :
eas build:configure
```

`eas init` et `eas build:configure` écrivent `expo.extra.eas.projectId` dans
`app.json`. Committez le véritable UUID affiché. `eas.json` contient déjà les
profils `development`, `preview` et `production`.

Enregistrez l’App ID `com.khaledromdhane.glowcose` dans le portail Apple
Developer (ou laissez EAS le créer lors du premier build iOS lorsque la
confirmation est demandée).

Créez l’app iOS dans [App Store Connect](https://appstoreconnect.apple.com)
avec ce même bundle ID **avant** `eas submit`.

### Continuité du produit

Le nom affiché et le slug Expo sont désormais **Gluciel**. Le schéma d’URI
`glowcose` et le bundle ID `com.khaledromdhane.glowcose` sont volontairement
conservés : ils constituent des identifiants techniques de continuité pour les
liens profonds, l’authentification et les mises à jour. Ils ne sont pas une
marque destinée aux utilisateurs.

### Build (binaire App Store / TestFlight)

```sh
cd mobile
eas build --platform ios --profile production
```

Autres profils :

```sh
# Client de développement, installation interne (requiert expo-dev-client,
# déjà présent)
eas build --platform ios --profile development

# Binaire proche de la production, diffusion interne/ad hoc (pas TestFlight)
eas build --platform ios --profile preview
```

`production` utilise l’auto-incrémentation distante du `buildNumber` iOS
(`cli.appVersionSource: remote`). Le premier build de production part de
`ios.buildNumber` `"1"` dans `app.json`.

### Envoi vers TestFlight

```sh
cd mobile
eas submit --platform ios --profile production
```

Cette commande envoie un build iOS de **production** vers App Store Connect
(TestFlight). Elle ne publie pas l’app sur l’App Store.

Après l’envoi, terminez la configuration TestFlight dans App Store Connect :
conformité à l’exportation (`ITSAppUsesNonExemptEncryption` est déjà à
`false` dans `app.json`), testeurs et attente de traitement.

### Identifiants Apple — privilégier une clé API ASC (CI)

Ne commitez **jamais** les clés `.p8` : elles sont ignorées par Git.

**Option privilégiée (CI et envoi reproductible) :**

1. Dans App Store Connect → Users and Access → Integrations → App Store
   Connect API, créez une clé (App Manager).
2. Téléchargez une seule fois le fichier `.p8`. Notez le **Key ID** et
   l’**Issuer ID**.
3. Stockez la clé dans Expo, jamais dans Git :

```sh
cd mobile
eas credentials -p ios
```

Choisissez le profil production et le parcours App Store Connect API Key, puis
ajoutez le Key ID, l’Issuer ID et le `.p8`. EAS les conserve dans les
identifiants du projet.

**Alternative (fichiers locaux, toujours hors de Git) :** ajoutez sur votre
machine uniquement, dans `eas.json` ou un fichier de surcharge ignoré, les
champs de `submit.production.ios` :

- `ascApiKeyPath` — chemin vers le `.p8`
- `ascApiKeyId` — Key ID
- `ascApiKeyIssuerId` — Issuer ID

L’**Apple ID interactif** fonctionne sur un ordinateur (`eas submit` demande
les informations nécessaires), mais il convient mal à la CI à cause de la
2FA. Préférez une clé API ASC.

Après création de l’app ASC, vous pouvez renseigner
`submit.production.ios.ascAppId` (l’identifiant Apple numérique dans App Store
Connect, **pas** le bundle ID). Laissez-le vide jusque-là : la CLI le demandera.

### Ce que ce dépôt ne fait pas à votre place

- Il n’envoie pas un build à TestFlight tout seul.
- Il ne contient ni identifiant d’équipe Apple ni secret.
- Une connexion Expo seule ne peut pas envoyer un build vers TestFlight.
