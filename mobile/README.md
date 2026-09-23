# Application Expo Gluciel

Application mobile du carnet personnel de glycémie Gluciel. Lancez-la depuis
ce dossier :

```sh
npm install
npx expo start
```

Consultez le [README](../README.md) à la racine pour les variables
d’environnement, le carnet local et le backend Convex partagé.

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

## Mises à jour OTA (EAS Update)

Le JS, les styles et les assets embarqués partent avec [EAS Update](https://docs.expo.dev/eas-update/introduction/) sans repasser par l’App Store, tant que le **runtime natif** est le même (`runtimeVersion` = version d’app, aujourd’hui `0.2.0`).

Un OTA **ne peut pas** ajouter un module natif, une permission, un splash ou un bump de SDK Expo : dans ce cas, nouveau `eas build` + `eas submit`.

Les profils EAS portent déjà un `channel` du même nom (`development`, `preview`, `production`). L’app vérifie une mise à jour au lancement, télécharge en arrière-plan, et l’applique au redémarrage suivant (fermer complètement l’app, puis la rouvrir, jusqu’à deux fois).

### Publier une mise à jour

Il faut un **binaire** preview ou production **construit après** l’ajout de `expo-updates`. Les TestFlight existants ne se mettront pas à jour tout seuls.

```sh
cd mobile
eas update --channel preview --environment preview --message "description courte"
# ou : npm run eas:update:preview -- --message "description courte"
```

Production, seulement une fois le binaire de production OTA-capable installé :

```sh
eas update --channel production --environment preview --message "description courte"
# ou : npm run eas:update:production -- --message "description courte"
```

`--environment` est obligatoire (SDK 57) : il injecte les `EXPO_PUBLIC_*` **du projet EAS**, pas le `.env` local. **Toujours utiliser `--environment preview` pour Gluciel**, y compris sur le channel `production`. L’environnement EAS nommé `production` mélange aussi des variables **account-wide** Kristine (`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_CONVEX_URL`) qui gagnent et pointent l’app vers `clerk.kristineapp.com`. `preview` n’a que le Clerk / Convex Gluciel (`adapted-squid-4107` / `artful-puffin-486`).

### Ce que ce dépôt ne fait pas à votre place

- Il n’envoie pas un build à TestFlight tout seul.
- Il ne publie pas un OTA tout seul.
- Il ne contient ni identifiant d’équipe Apple ni secret.
- Une connexion Expo seule ne peut pas envoyer un build vers TestFlight.
