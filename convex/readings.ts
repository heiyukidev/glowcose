import { filter } from "lodash";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { postMealOffset, readingContext } from "./schema";

const readingReturn = v.object({
  _id: v.id("readings"),
  _creationTime: v.number(),
  userId: v.string(),
  carnetId: v.optional(v.id("carnets")),
  recordedBy: v.optional(v.string()),
  valueMgDl: v.number(),
  context: readingContext,
  postMealOffset: v.optional(postMealOffset),
  note: v.optional(v.string()),
  photoUrl: v.optional(v.string()),
  takenAt: v.number(),
  createdAt: v.number(),
  archivedAt: v.optional(v.number()),
});

async function membershipForUser(ctx: QueryCtx | MutationCtx, userId: string) {
  return await ctx.db
    .query("carnetMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

async function requireCarnetId(
  ctx: QueryCtx | MutationCtx,
  userId: string,
): Promise<Id<"carnets">> {
  const membership = await membershipForUser(ctx, userId);
  if (!membership) {
    throw new Error("Carnet introuvable");
  }
  return membership.carnetId;
}

async function loadReadableReading(
  ctx: QueryCtx | MutationCtx,
  id: Id<"readings">,
  userId: string,
) {
  const reading = await ctx.db.get(id);
  if (!reading) {
    throw new Error("Mesure introuvable");
  }
  const carnetId = reading.carnetId;
  if (carnetId) {
    const membership = await ctx.db
      .query("carnetMembers")
      .withIndex("by_carnet_and_user", (q) =>
        q.eq("carnetId", carnetId).eq("userId", userId),
      )
      .unique();
    if (!membership) {
      throw new Error("Mesure introuvable");
    }
    return reading;
  }
  if (reading.userId !== userId) {
    throw new Error("Mesure introuvable");
  }
  return reading;
}

export const list = query({
  args: {},
  returns: v.array(readingReturn),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const membership = await membershipForUser(ctx, userId);
    if (!membership) {
      return [];
    }
    const rows = await ctx.db
      .query("readings")
      .withIndex("by_carnet_takenAt", (q) =>
        q.eq("carnetId", membership.carnetId),
      )
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
  returns: v.id("readings"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const carnetId = await requireCarnetId(ctx, userId);
    const createdAt = Date.now();
    return await ctx.db.insert("readings", {
      userId,
      carnetId,
      recordedBy: userId,
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
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await loadReadableReading(ctx, args.id, userId);
    await ctx.db.patch(args.id, {
      valueMgDl: args.valueMgDl,
      context: args.context,
      postMealOffset: args.postMealOffset,
      note: args.note,
      photoUrl: args.photoUrl,
      takenAt: args.takenAt,
    });
    return null;
  },
});

export const archive = mutation({
  args: { id: v.id("readings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await loadReadableReading(ctx, args.id, userId);
    await ctx.db.patch(args.id, { archivedAt: Date.now() });
    return null;
  },
});
