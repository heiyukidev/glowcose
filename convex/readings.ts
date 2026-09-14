import { filter } from "lodash";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { postMealOffset, readingContext } from "./schema";

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Non authentifié");
  }
  return identity.subject;
}

async function loadOwnReading(
  ctx: QueryCtx | MutationCtx,
  id: Id<"readings">,
  userId: string,
) {
  const reading = await ctx.db.get(id);
  if (!reading || reading.userId !== userId) {
    throw new Error("Mesure introuvable");
  }
  return reading;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("readings")
      .withIndex("by_user_takenAt", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return filter(rows, (row) => !row.archivedAt);
  },
});

export const add = mutation({
  args: {
    valueMgDl: v.number(),
    context: readingContext,
    postMealOffset: v.optional(postMealOffset),
    note: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    takenAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const createdAt = Date.now();
    return await ctx.db.insert("readings", {
      userId,
      valueMgDl: args.valueMgDl,
      context: args.context,
      postMealOffset: args.postMealOffset,
      note: args.note,
      photoUrl: args.photoUrl,
      takenAt: args.takenAt,
      createdAt,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("readings"),
    valueMgDl: v.number(),
    context: readingContext,
    postMealOffset: v.optional(postMealOffset),
    note: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    takenAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await loadOwnReading(ctx, args.id, userId);
    await ctx.db.patch(args.id, {
      valueMgDl: args.valueMgDl,
      context: args.context,
      postMealOffset: args.postMealOffset,
      note: args.note,
      photoUrl: args.photoUrl,
      takenAt: args.takenAt,
    });
  },
});

export const archive = mutation({
  args: { id: v.id("readings") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await loadOwnReading(ctx, args.id, userId);
    await ctx.db.patch(args.id, { archivedAt: Date.now() });
  },
});
