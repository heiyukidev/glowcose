import { cloneDeep, filter, find, join, size, times } from "lodash";
import { v } from "convex/values";

import {
  INVITE_CODE_LENGTH,
  INVITE_TTL_MS,
  MAX_CARNET_MEMBERS,
  normalizeInviteCode,
} from "../packages/core/src/carnet";
import { THRESHOLD_PRESETS, type DiabetesType } from "../packages/core/src/glucose";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { diabetesType, thresholdPreset } from "./schema";

const INVITE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

const bandReturn = v.object({
  hypoBelow: v.number(),
  greenMax: v.number(),
  orangeMax: v.number(),
});

const carnetSnapshotReturn = v.object({
  carnetId: v.id("carnets"),
  memberCount: v.number(),
  diabetesType,
  thresholds: v.object({
    beforeMeal: bandReturn,
    after1h: bandReturn,
    after2h: bandReturn,
    other: bandReturn,
  }),
  invite: v.union(
    v.null(),
    v.object({
      code: v.string(),
      expiresAt: v.number(),
    }),
  ),
});

function randomInviteCode(): string {
  return join(
    times(INVITE_CODE_LENGTH, () =>
      INVITE_ALPHABET.charAt(
        Math.floor(Math.random() * INVITE_ALPHABET.length),
      ),
    ),
    "",
  );
}

async function membershipForUser(ctx: QueryCtx | MutationCtx, userId: string) {
  return await ctx.db
    .query("carnetMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

async function membersOfCarnet(
  ctx: QueryCtx | MutationCtx,
  carnetId: Id<"carnets">,
) {
  return await ctx.db
    .query("carnetMembers")
    .withIndex("by_carnet", (q) => q.eq("carnetId", carnetId))
    .collect();
}

async function unusedInviteForCarnet(
  ctx: QueryCtx | MutationCtx,
  carnetId: Id<"carnets">,
) {
  const invites = await ctx.db
    .query("carnetInvites")
    .withIndex("by_carnet", (q) => q.eq("carnetId", carnetId))
    .collect();
  return find(invites, (invite) => invite.usedAt === undefined) ?? null;
}

async function migrateSoloReadings(
  ctx: MutationCtx,
  userId: string,
  carnetId: Id<"carnets">,
) {
  const rows = await ctx.db
    .query("readings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const owned = filter(rows, (row) => row.carnetId === undefined);
  for (const row of owned) {
    await ctx.db.patch(row._id, {
      carnetId,
      recordedBy: row.recordedBy ?? userId,
    });
  }
}

async function leaveSoloCarnet(
  ctx: MutationCtx,
  userId: string,
  joiningCarnetId: Id<"carnets">,
) {
  const current = await membershipForUser(ctx, userId);
  if (!current || current.carnetId === joiningCarnetId) {
    return;
  }
  const siblings = await membersOfCarnet(ctx, current.carnetId);
  if (size(siblings) > 1) {
    throw new Error("Ce compte est déjà sur un carnet partagé");
  }
  await ctx.db.delete(current._id);
}

async function createCarnetForUser(
  ctx: MutationCtx,
  userId: string,
  type: DiabetesType,
): Promise<Id<"carnets">> {
  const now = Date.now();
  const carnetId = await ctx.db.insert("carnets", {
    createdBy: userId,
    createdAt: now,
    diabetesType: type,
    thresholds: cloneDeep(THRESHOLD_PRESETS[type]),
  });
  await ctx.db.insert("carnetMembers", {
    carnetId,
    userId,
    joinedAt: now,
  });
  await migrateSoloReadings(ctx, userId, carnetId);
  return carnetId;
}

async function ensureCarnetId(
  ctx: MutationCtx,
  userId: string,
  type?: DiabetesType,
): Promise<Id<"carnets">> {
  const existing = await membershipForUser(ctx, userId);
  if (existing) {
    return existing.carnetId;
  }
  return await createCarnetForUser(ctx, userId, type ?? "gestational");
}

async function snapshotForCarnet(ctx: QueryCtx | MutationCtx, carnetId: Id<"carnets">) {
  const carnet = await ctx.db.get(carnetId);
  if (!carnet) {
    return null;
  }
  const members = await membersOfCarnet(ctx, carnetId);
  const invite = await unusedInviteForCarnet(ctx, carnetId);
  return {
    carnetId,
    memberCount: size(members),
    diabetesType: carnet.diabetesType,
    thresholds: carnet.thresholds,
    invite: invite
      ? { code: invite.code, expiresAt: invite.expiresAt }
      : null,
  };
}

export const getMine = query({
  args: {},
  returns: v.union(carnetSnapshotReturn, v.null()),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const membership = await membershipForUser(ctx, userId);
    if (!membership) {
      return null;
    }
    return await snapshotForCarnet(ctx, membership.carnetId);
  },
});

export const ensureMine = mutation({
  args: {
    diabetesType: v.optional(diabetesType),
  },
  returns: v.object({ carnetId: v.id("carnets") }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const carnetId = await ensureCarnetId(ctx, userId, args.diabetesType);
    return { carnetId };
  },
});

export const updateSettings = mutation({
  args: {
    diabetesType: v.optional(diabetesType),
    thresholds: v.optional(thresholdPreset),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const carnetId = await ensureCarnetId(ctx, userId, args.diabetesType);
    const carnet = await ctx.db.get(carnetId);
    if (!carnet) {
      throw new Error("Carnet introuvable");
    }
    if (args.diabetesType !== undefined && args.thresholds === undefined) {
      await ctx.db.patch(carnetId, {
        diabetesType: args.diabetesType,
        thresholds: cloneDeep(THRESHOLD_PRESETS[args.diabetesType]),
      });
      return null;
    }
    const patch: {
      diabetesType?: DiabetesType;
      thresholds?: typeof carnet.thresholds;
    } = {};
    if (args.diabetesType !== undefined) {
      patch.diabetesType = args.diabetesType;
    }
    if (args.thresholds !== undefined) {
      patch.thresholds = args.thresholds;
    }
    if (patch.diabetesType !== undefined || patch.thresholds !== undefined) {
      await ctx.db.patch(carnetId, patch);
    }
    return null;
  },
});

export const createInvite = mutation({
  args: {},
  returns: v.object({
    code: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const carnetId = await ensureCarnetId(ctx, userId);
    const members = await membersOfCarnet(ctx, carnetId);
    if (size(members) >= MAX_CARNET_MEMBERS) {
      throw new Error("Ce carnet est déjà partagé");
    }
    const unused = await unusedInviteForCarnet(ctx, carnetId);
    if (unused) {
      await ctx.db.delete(unused._id);
    }
    let code = randomInviteCode();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const clash = await ctx.db
        .query("carnetInvites")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!clash) {
        break;
      }
      code = randomInviteCode();
    }
    const now = Date.now();
    const expiresAt = now + INVITE_TTL_MS;
    await ctx.db.insert("carnetInvites", {
      carnetId,
      code,
      createdBy: userId,
      createdAt: now,
      expiresAt,
    });
    return { code, expiresAt };
  },
});

export const joinWithCode = mutation({
  args: { code: v.string() },
  returns: v.object({ carnetId: v.id("carnets") }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const code = normalizeInviteCode(args.code);
    if (code.length !== INVITE_CODE_LENGTH) {
      throw new Error("Code d’invitation invalide");
    }
    const invite = await ctx.db
      .query("carnetInvites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!invite) {
      throw new Error("Code d’invitation introuvable");
    }
    if (invite.usedAt !== undefined) {
      throw new Error("Ce code a déjà été utilisé");
    }
    if (invite.expiresAt < Date.now()) {
      throw new Error("Ce code a expiré");
    }
    const already = await ctx.db
      .query("carnetMembers")
      .withIndex("by_carnet_and_user", (q) =>
        q.eq("carnetId", invite.carnetId).eq("userId", userId),
      )
      .unique();
    if (already) {
      return { carnetId: invite.carnetId };
    }
    const members = await membersOfCarnet(ctx, invite.carnetId);
    if (size(members) >= MAX_CARNET_MEMBERS) {
      throw new Error("Ce carnet est déjà partagé");
    }
    await leaveSoloCarnet(ctx, userId, invite.carnetId);
    const now = Date.now();
    await ctx.db.insert("carnetMembers", {
      carnetId: invite.carnetId,
      userId,
      joinedAt: now,
    });
    await ctx.db.patch(invite._id, {
      usedAt: now,
      usedBy: userId,
    });
    return { carnetId: invite.carnetId };
  },
});
