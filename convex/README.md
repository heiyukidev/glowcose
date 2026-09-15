This folder is the Convex backend shared by the Next.js web app and the Expo mobile app.

```sh
npx convex dev
```

That command links a deployment, regenerates `_generated/`, and watches functions.

Until a project is linked, the committed `_generated/` stubs let `api.readings.*` import so **web `npm run build` still succeeds** in demo mode (no Convex URL required).

Auth: set `CLERK_JWT_ISSUER_DOMAIN` on the Convex deployment (Clerk JWT issuer URL). Functions in `readings.ts` require `ctx.auth.getUserIdentity()`.
