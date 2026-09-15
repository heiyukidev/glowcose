# Gluciel

Carnet personnel de glycémie (français d’abord). **Ce n’est pas un dispositif médical** et ça ne remplace pas un avis médical.

Web : Next.js + Clerk + Convex. Sans clés d’auth, le carnet reste local (vide au départ) sur l’appareil.

Mobile : Expo (React Native) dans `mobile/`, même modèle produit, même backend Convex quand il est configuré.

## Disposition du dépôt

Le web Next.js reste **à la racine** pour que le déploiement Vercel actuel continue de builder sans changer le Root Directory.

| Chemin | Rôle |
| --- | --- |
| `src/` | App web Next.js |
| `convex/` | Schéma + fonctions Convex, partagés web + mobile |
| `packages/core` | Unités, bandes de couleurs, libellés FR |
| `mobile/` | App Expo Router (npm à part, pas de workspaces) |

Pas de npm workspaces : Next (racine) et Expo (`mobile/`) ont chacun leur `node_modules`, pour éviter un conflit React Native / React web.

## Web

```sh
npm install
npm run dev
```

Build Vercel / local :

```sh
npm run build
```

Sans `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` ni `NEXT_PUBLIC_CONVEX_URL`, l’app enregistre les mesures dans localStorage (`glowcose.readings.v2`). Le carnet démarre vide.

## Mobile

```sh
cd mobile
npm install
npx expo start
```

Puis iOS Simulator, Android, ou l’app Expo Go. Aperçu navigateur :

```sh
npx expo start --web
# ou depuis la racine : npm run mobile:web
```

Sans `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` ni `EXPO_PUBLIC_CONVEX_URL` : mêmes mesures locales (AsyncStorage = équivalent localStorage).

Boucle v0.2 : onboarding (type de diabète) → Aujourd’hui → Ajouter (couleurs) → Historique → Graphique (7j / 30j) → Réglages (unités + seuils).

Photo repas : `expo-image-picker`, URI locale (stub). Pas de R2 pour l’instant.

### TestFlight (iOS)

Config EAS : `mobile/eas.json` (`development`, `preview`, `production`).

**Un compte Expo ne suffit pas.** Il faut le **Apple Developer Program** (99 $/an) et une app dans **App Store Connect** avec le bundle ID `com.khaledromdhane.glowcose`. Détail et commandes : [`mobile/README.md`](mobile/README.md#testflight-eas-build--submit).

```sh
cd mobile
npm i -g eas-cli   # ou : npx eas-cli
eas login
eas init
eas build:configure
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

`eas init` écrit `extra.eas.projectId` dans `mobile/app.json` — à committer. Ne pas inventer d’IDs Apple. Pour le CI, une **clé API App Store Connect** (via `eas credentials`) est préférable à un Apple ID + 2FA.

### Identifiants de continuité

Gluciel conserve les clés de stockage locales `glowcose.settings.v2` et
`glowcose.readings.v2`, ainsi que l’identifiant natif
`com.khaledromdhane.glowcose`, pour ne pas couper l’accès aux données et aux
mises à jour existantes. Le schéma d’URI `glowcose` est également conservé :
il peut déjà être enregistré dans des liens profonds ou des redirections
d’authentification. Ces identifiants techniques ne sont jamais affichés comme
marque auprès des personnes qui utilisent l’app.

## Variables d’environnement

Copier `.env.example` à la racine (web) et `mobile/.env.example` vers `mobile/.env` (Expo).

| Variable | Où | Rôle |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Web | Clerk ; vide = carnet local |
| `CLERK_SECRET_KEY` | Web (serveur) | Clerk middleware |
| `NEXT_PUBLIC_CONVEX_URL` | Web | Convex ; vide = carnet local |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Mobile | Clerk Expo ; vide = carnet local |
| `EXPO_PUBLIC_CONVEX_URL` | Mobile | Convex ; vide = carnet local |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex dashboard | Issuer JWT Clerk (ex. `https://xxx.clerk.accounts.dev`) |

Les deux apps doivent pointer vers **le même** projet Clerk + Convex pour partager le carnet d’un compte.

## Convex

```sh
npx convex dev
```

Lie le projet, régénère `convex/_generated/`, et pousse le schéma `readings`.

Les stubs `_generated/` sont **commités** pour que le build web ne casse plus sur `../../convex/_generated/api` sans URL Convex. Après `npx convex dev`, recommiter les fichiers générés.

Sans déploiement Convex, le web et le mobile restent utilisables en local (carnet vide, mesures sur l’appareil).

## Produit (v0.2)

- Défaut : diabète **gestationnel**, unités **g/L**, stockage canonique `valueMgDl`
- Bandes FR : jeûne / avant ≤ 95 mg/dL ; post 1h ≤ 140 ; post 2h ≤ 120 (bleu / vert / orange / rouge)
- Contextes : avant/après petit-déj., déjeuner, dîner, autre ; `postMealOffset` 1h \| 2h pour les `after_*`
- Archive (pas de hard-delete) depuis l’écran modifier

## Scripts racine

```sh
npm run dev          # web
npm run build        # web (Vercel)
npm run mobile       # expo start
npm run mobile:web   # expo start --web
```
