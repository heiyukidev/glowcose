Expo app for Glowcose. Run from this folder:

```sh
npm install
npx expo start
```

See the root [README](../README.md) for env vars, demo mode, and the shared Convex backend.

## TestFlight (EAS Build + Submit)

An **Expo account is not enough** for TestFlight. You also need:

1. **Apple Developer Program** (paid, currently $99/year)
2. An **App Store Connect** app record whose bundle ID is `app.glowcose.mobile`
3. Signed Apple developer agreements in App Store Connect

This repo does **not** contain an EAS `projectId`, Apple Team ID, or ASC app ID. Those are created when you log in and run configure — do not invent them.

### One-time setup (from `mobile/`)

```sh
cd mobile
npm install

# CLI
npm i -g eas-cli
# or use npx without a global install:
# npx eas-cli --version

eas login
# same Expo account Khaled already has

# Creates extra.eas.projectId in app.json — commit that change
eas init
# and/or:
eas build:configure
```

`eas init` / `eas build:configure` write `expo.extra.eas.projectId` into `app.json`. Commit the real UUID they print. Until then, `eas.json` is already in git with `development`, `preview`, and `production` profiles.

Register the App ID `app.glowcose.mobile` on the Apple Developer portal (or let EAS create it on first iOS build when you confirm the prompt).

Create the iOS app in [App Store Connect](https://appstoreconnect.apple.com) with that same bundle ID **before** `eas submit`.

### Build (App Store / TestFlight binary)

```sh
cd mobile
eas build --platform ios --profile production
```

Other profiles:

```sh
# Dev client, internal install (needs expo-dev-client — already a dependency)
eas build --platform ios --profile development

# Production-like binary, internal/ad-hoc distribution (not TestFlight)
eas build --platform ios --profile preview
```

`production` uses remote iOS `buildNumber` auto-increment (`cli.appVersionSource: remote`). First production build starts from `ios.buildNumber` `"1"` in `app.json`.

### Submit to TestFlight

```sh
cd mobile
eas submit --platform ios --profile production
```

This uploads a **production** iOS build to App Store Connect (TestFlight). It does not publish to the public App Store.

After submit, finish TestFlight in App Store Connect: export compliance (already set `ITSAppUsesNonExemptEncryption` to `false` in `app.json`), testers, and processing wait.

### Apple credentials — prefer an ASC API key (CI)

Do **not** commit `.p8` keys. They are gitignored.

**Preferred (CI and repeatable submit):**

1. In App Store Connect → Users and Access → Integrations → App Store Connect API, create a key (App Manager).
2. Download the `.p8` once. Note **Key ID** and **Issuer ID**.
3. Store the key on Expo, not in git:

```sh
cd mobile
eas credentials -p ios
```

Pick the production profile / App Store Connect API Key flow and paste Key ID, Issuer ID, and the `.p8`. EAS keeps it in the project credentials.

**Alternative (local files, still not in git):** add to `eas.json` `submit.production.ios` on your machine only (or a gitignored overlay):

- `ascApiKeyPath` — path to the `.p8`
- `ascApiKeyId` — Key ID
- `ascApiKeyIssuerId` — Issuer ID

**Interactive Apple ID** works for a laptop (`eas submit` will prompt). It is a poor fit for CI (2FA). Prefer the ASC API key.

After the ASC app exists, you may set `submit.production.ios.ascAppId` (the numeric Apple ID in App Store Connect, **not** the bundle ID). Leave it unset until then — the CLI will prompt.

### What this repo will not do for you

- It does not submit a build to TestFlight by itself.
- It does not include Apple Team IDs or secrets.
- Expo login alone cannot push to TestFlight.
