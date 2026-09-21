# Convex File Storage for Photos

A Photo is stored as Convex File Storage bytes, with the storage id on the Meal (see ADR 0005). Cloudflare R2 was the earlier “later” idea; native `ctx.storage` is enough for a one-Subject Carnet and avoids a second vendor until cost or CDN actually shows up. Display URLs are minted at read time for Carnet Members only. Legacy stub `photoUrl` strings stay readable; there is no backfill.
