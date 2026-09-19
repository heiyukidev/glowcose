import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function requireUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Non authentifié");
  }
  return identity.subject;
}
