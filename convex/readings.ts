import { compact, filter, find, isUndefined, keyBy, map, omit, omitBy, orderBy, size, uniq } from "lodash";
import { v } from "convex/values";

import { planImport } from "../packages/core/src/csv-import";
import {
  assertSavableReading,
  clampNote,
} from "../packages/core/src/glucose";
import { localDateKey, type MealPhoto } from "../packages/core/src/meal";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import {
  archiveMealIfEmpty,
  asStoredPhotos,
  attachMeal,
  incomingPhotos,
  requireStoredPhoto,
  resolvePhotoUrls,
} from "./lib/meals";
import { mealPhoto, mealSlot, postMealOffset, readingContext } from "./schema";

const readingReturn = v.object({
  _id: v.id("readings"),
  _creationTime: v.number(),
  userId: v.string(),
  carnetId: v.optional(v.id("carnets")),
  recordedBy: v.optional(v.string()),
  mealId: v.optional(v.id("meals")),
  valueMgDl: v.number(),
  context: readingContext,
  postMealOffset: v.optional(postMealOffset),
  note: v.optional(v.string()),
  photos: v.array(mealPhoto),
  photoUrl: v.optional(v.string()),
  photoStorageId: v.optional(v.id("_storage")),
  takenAt: v.number(),
  createdAt: v.number(),
  archivedAt: v.optional(v.number()),
  clientId: v.optional(v.string()),
  rememberedNote: v.optional(v.string()),
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

async function presentReading(
  ctx: QueryCtx,
  row: Doc<"readings">,
  meal?: Doc<"meals"> | null,
) {
  let note = row.note;
  let photos: MealPhoto[] =
    incomingPhotos({
      photoStorageId: row.photoStorageId,
      photoUrl: row.photoUrl,
    }) ?? [];
  const resolvedMeal = meal ?? (row.mealId ? await ctx.db.get(row.mealId) : null);
  if (resolvedMeal && !resolvedMeal.archivedAt) {
    note = resolvedMeal.note;
    photos = resolvedMeal.photos;
  }
  const resolved = await resolvePhotoUrls(ctx, photos);
  const first = resolved[0];
  return {
    _id: row._id,
    _creationTime: row._creationTime,
    userId: row.userId,
    carnetId: row.carnetId,
    recordedBy: row.recordedBy,
    mealId: row.mealId,
    valueMgDl: row.valueMgDl,
    context: row.context,
    postMealOffset: row.postMealOffset,
    note,
    photos: asStoredPhotos(resolved),
    photoUrl: first?.url,
    photoStorageId: first?.storageId as Id<"_storage"> | undefined,
    takenAt: row.takenAt,
    createdAt: row.createdAt,
    archivedAt: row.archivedAt,
    clientId: row.clientId,
    rememberedNote: row.rememberedNote,
  };
}

async function liftLegacyReadings(
  ctx: MutationCtx,
  carnetId: Id<"carnets">,
  userId: string,
  timeZone?: string,
) {
  const rows = await ctx.db
    .query("readings")
    .withIndex("by_carnet_takenAt", (q) => q.eq("carnetId", carnetId))
    .collect();
  const pending = orderBy(
    filter(rows, (row) => !row.archivedAt && !row.mealId),
    ["takenAt"],
    ["asc"],
  );
  if (size(pending) === 0) return;
  let live: Doc<"meals">[] | undefined;
  for (const row of pending) {
    const attached = await attachMeal(ctx, {
      userId,
      carnetId,
      context: row.context,
      takenAt: row.takenAt,
      note: row.note,
      photos: incomingPhotos(row),
      now: row.createdAt,
      mode: "lift",
      timeZone,
      live,
    });
    live = attached.live;
    await ctx.db.patch(row._id, { mealId: attached.mealId });
  }
}

async function validatePhotos(
  ctx: MutationCtx,
  photos: MealPhoto[],
) {
  for (const photo of photos) {
    if (photo.storageId) {
      await requireStoredPhoto(ctx, photo.storageId as Id<"_storage">);
    }
  }
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
    const liveRows = filter(rows, (row) => !row.archivedAt);
    const mealIds = uniq(compact(map(liveRows, (row) => row.mealId)));
    const meals = compact(
      await Promise.all(map(mealIds, (id) => ctx.db.get(id))),
    );
    const mealsById = keyBy(meals, "_id");
    return await Promise.all(
      map(liveRows, (row) =>
        presentReading(ctx, row, row.mealId ? mealsById[row.mealId] : undefined),
      ),
    );
  },
});

const importedReading = v.object({
  valueMgDl: v.number(),
  context: readingContext,
  postMealOffset: v.optional(postMealOffset),
  note: v.optional(v.string()),
  takenAt: v.number(),
});

export const generatePhotoUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await requireCarnetId(ctx, userId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const add = mutation({
  args: {
    valueMgDl: v.number(),
    context: readingContext,
    postMealOffset: v.optional(postMealOffset),
    note: v.optional(v.string()),
    photos: v.optional(v.array(mealPhoto)),
    photoStorageId: v.optional(v.id("_storage")),
    takenAt: v.number(),
    timeZone: v.optional(v.string()),
  },
  returns: v.id("readings"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const carnetId = await requireCarnetId(ctx, userId);
    await liftLegacyReadings(ctx, carnetId, userId, args.timeZone);
    assertSavableReading({
      valueMgDl: args.valueMgDl,
      takenAt: args.takenAt,
    });
    const note = clampNote(args.note);
    const photos = incomingPhotos(args);
    if (photos) {
      await validatePhotos(ctx, photos);
    }
    const createdAt = Date.now();
    const attached = await attachMeal(ctx, {
      userId,
      carnetId,
      context: args.context,
      takenAt: args.takenAt,
      note,
      photos,
      now: createdAt,
      mode: "replace",
      timeZone: args.timeZone,
    });
    return await ctx.db.insert("readings", {
      userId,
      carnetId,
      recordedBy: userId,
      mealId: attached.mealId,
      valueMgDl: args.valueMgDl,
      context: args.context,
      postMealOffset: args.postMealOffset,
      takenAt: args.takenAt,
      createdAt,
    });
  },
});

export const importMany = mutation({
  args: {
    readings: v.array(importedReading),
    timeZone: v.optional(v.string()),
  },
  returns: v.object({
    inserted: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const carnetId = await requireCarnetId(ctx, userId);
    await liftLegacyReadings(ctx, carnetId, userId, args.timeZone);
    const existing = await ctx.db
      .query("readings")
      .withIndex("by_carnet_takenAt", (q) => q.eq("carnetId", carnetId))
      .collect();
    const { toAdd, skippedDuplicate } = planImport(existing, args.readings);
    const createdAt = Date.now();
    let live: Doc<"meals">[] | undefined;
    for (const reading of toAdd) {
      assertSavableReading({
        valueMgDl: reading.valueMgDl,
        takenAt: reading.takenAt,
      });
      const note = clampNote(reading.note);
      const attached = await attachMeal(ctx, {
        userId,
        carnetId,
        context: reading.context,
        takenAt: reading.takenAt,
        note,
        now: createdAt,
        mode: "lift",
        timeZone: args.timeZone,
        live,
      });
      live = attached.live;
      await ctx.db.insert("readings", {
        userId,
        carnetId,
        recordedBy: userId,
        mealId: attached.mealId,
        valueMgDl: reading.valueMgDl,
        context: reading.context,
        postMealOffset: reading.postMealOffset,
        takenAt: reading.takenAt,
        createdAt,
      });
    }
    return {
      inserted: size(toAdd),
      skipped: skippedDuplicate,
    };
  },
});

export const update = mutation({
  args: {
    id: v.id("readings"),
    valueMgDl: v.number(),
    context: readingContext,
    postMealOffset: v.optional(postMealOffset),
    note: v.optional(v.string()),
    photos: v.optional(v.array(mealPhoto)),
    photoStorageId: v.optional(v.id("_storage")),
    photoUrl: v.optional(v.string()),
    takenAt: v.number(),
    timeZone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const reading = await loadReadableReading(ctx, args.id, userId);
    const carnetId = reading.carnetId ?? (await requireCarnetId(ctx, userId));
    await liftLegacyReadings(ctx, carnetId, userId, args.timeZone);
    assertSavableReading({
      valueMgDl: args.valueMgDl,
      takenAt: args.takenAt,
    });
    const note = clampNote(args.note);
    const photos = incomingPhotos(args);
    if (photos) {
      await validatePhotos(ctx, photos);
    }
    const now = Date.now();
    const previousMealId = reading.mealId;
    const attached = await attachMeal(ctx, {
      userId,
      carnetId,
      context: args.context,
      takenAt: args.takenAt,
      note,
      photos,
      now,
      mode: "replace",
      currentMealId: previousMealId,
      timeZone: args.timeZone,
    });
    const mealId = attached.mealId;
    const next = omitBy(
      {
        ...omit(reading, [
          "_id",
          "_creationTime",
          "photoStorageId",
          "photoUrl",
          "note",
        ]),
        carnetId,
        mealId,
        valueMgDl: args.valueMgDl,
        context: args.context,
        postMealOffset: args.postMealOffset,
        takenAt: args.takenAt,
      },
      isUndefined,
    );
    await ctx.db.replace(
      args.id,
      next as Omit<Doc<"readings">, "_id" | "_creationTime">,
    );
    if (previousMealId && previousMealId !== mealId) {
      await archiveMealIfEmpty(ctx, previousMealId, now);
    }
    return null;
  },
});

export const archive = mutation({
  args: { id: v.id("readings") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const reading = await loadReadableReading(ctx, args.id, userId);
    const now = Date.now();
    await ctx.db.patch(args.id, { archivedAt: now });
    if (reading.mealId) {
      await archiveMealIfEmpty(ctx, reading.mealId, now);
    }
    return null;
  },
});

const snapshotMeal = v.object({
  _id: v.id("meals"),
  clientId: v.optional(v.string()),
  slot: mealSlot,
  anchorAt: v.number(),
  note: v.optional(v.string()),
  rememberedNote: v.optional(v.string()),
  photos: v.array(mealPhoto),
  createdAt: v.number(),
  archivedAt: v.optional(v.number()),
});

export const snapshot = query({
  args: {},
  returns: v.object({
    meals: v.array(snapshotMeal),
    readings: v.array(readingReturn),
  }),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const membership = await membershipForUser(ctx, userId);
    if (!membership) {
      return { meals: [], readings: [] };
    }
    const meals = await ctx.db
      .query("meals")
      .withIndex("by_carnet", (q) => q.eq("carnetId", membership.carnetId))
      .collect();
    const rows = await ctx.db
      .query("readings")
      .withIndex("by_carnet_takenAt", (q) => q.eq("carnetId", membership.carnetId))
      .order("desc")
      .collect();
    const mealsById = keyBy(meals, "_id");
    return {
      meals: await Promise.all(
        map(meals, async (meal) => ({
          _id: meal._id,
          clientId: meal.clientId,
          slot: meal.slot,
          anchorAt: meal.anchorAt,
          note: meal.note,
          rememberedNote: meal.rememberedNote,
          photos: asStoredPhotos(await resolvePhotoUrls(ctx, meal.photos)),
          createdAt: meal.createdAt,
          archivedAt: meal.archivedAt,
        })),
      ),
      readings: await Promise.all(
        map(rows, (row) =>
          presentReading(ctx, row, row.mealId ? mealsById[row.mealId] : undefined),
        ),
      ),
    };
  },
});

const catchUpChange = v.object({
  clientReadingId: v.string(),
  clientMealId: v.string(),
  slot: mealSlot,
  anchorAt: v.number(),
  note: v.optional(v.string()),
  mealRememberedNote: v.optional(v.string()),
  photos: v.array(mealPhoto),
  valueMgDl: v.number(),
  context: readingContext,
  postMealOffset: v.optional(postMealOffset),
  takenAt: v.number(),
  createdAt: v.number(),
  archivedAt: v.optional(v.number()),
  recordedBy: v.optional(v.string()),
  rememberedNote: v.optional(v.string()),
});

export const applyCatchUp = mutation({
  args: {
    changes: v.array(catchUpChange),
    timeZone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const carnetId = await requireCarnetId(ctx, userId);
    for (const change of args.changes) {
      assertSavableReading({
        valueMgDl: change.valueMgDl,
        takenAt: change.takenAt,
      });
      const photos = filter(change.photos, (photo) => {
        if (photo.storageId) return true;
        return Boolean(
          photo.url &&
            !photo.url.startsWith("blob:") &&
            !photo.url.startsWith("data:"),
        );
      });
      if (photos.length > 0) {
        await validatePhotos(ctx, photos);
      }
      const mealId = await upsertCatchUpMeal(ctx, {
        userId,
        carnetId,
        change,
        photos,
        timeZone: args.timeZone,
      });
      await upsertCatchUpReading(ctx, {
        userId,
        carnetId,
        mealId,
        change,
      });
      if (change.archivedAt) {
        await archiveMealIfEmpty(ctx, mealId, change.archivedAt);
      }
    }
    return null;
  },
});

async function upsertCatchUpMeal(
  ctx: MutationCtx,
  args: {
    userId: string;
    carnetId: Id<"carnets">;
    change: {
      clientMealId: string;
      slot: Doc<"meals">["slot"];
      anchorAt: number;
      note?: string;
      mealRememberedNote?: string;
    };
    photos: MealPhoto[];
    timeZone?: string;
  },
): Promise<Id<"meals">> {
  const byClient = await ctx.db
    .query("meals")
    .withIndex("by_carnet_and_clientId", (q) =>
      q.eq("carnetId", args.carnetId).eq("clientId", args.change.clientMealId),
    )
    .unique();
  const normalized = ctx.db.normalizeId("meals", args.change.clientMealId);
  const byId = normalized ? await ctx.db.get(normalized) : null;
  const existing = byClient ?? (byId && byId.carnetId === args.carnetId ? byId : null);
  const day = localDateKey(args.change.anchorAt, args.timeZone);
  const rows = await ctx.db
    .query("meals")
    .withIndex("by_carnet", (q) => q.eq("carnetId", args.carnetId))
    .collect();
  const sameDay =
    args.change.slot === "other"
      ? undefined
      : find(
          filter(rows, (meal) => !meal.archivedAt && meal.slot === args.change.slot),
          (meal) => localDateKey(meal.anchorAt, args.timeZone) === day,
        );
  const target = existing ?? sameDay;
  if (target) {
    await ctx.db.patch(target._id, {
      note: args.change.note,
      rememberedNote: args.change.mealRememberedNote,
      photos: asStoredPhotos(args.photos),
      archivedAt: undefined,
      clientId: target.clientId ?? args.change.clientMealId,
    });
    return target._id;
  }
  return await ctx.db.insert("meals", {
    userId: args.userId,
    carnetId: args.carnetId,
    slot: args.change.slot,
    anchorAt: args.change.anchorAt,
    note: args.change.note,
    rememberedNote: args.change.mealRememberedNote,
    photos: asStoredPhotos(args.photos),
    createdAt: Date.now(),
    clientId: args.change.clientMealId,
  });
}

async function upsertCatchUpReading(
  ctx: MutationCtx,
  args: {
    userId: string;
    carnetId: Id<"carnets">;
    mealId: Id<"meals">;
    change: {
      clientReadingId: string;
      valueMgDl: number;
      context: Doc<"readings">["context"];
      postMealOffset?: 1 | 2;
      takenAt: number;
      createdAt: number;
      archivedAt?: number;
      recordedBy?: string;
      rememberedNote?: string;
    };
  },
): Promise<void> {
  const byClient = await ctx.db
    .query("readings")
    .withIndex("by_carnet_and_clientId", (q) =>
      q.eq("carnetId", args.carnetId).eq("clientId", args.change.clientReadingId),
    )
    .unique();
  const normalized = ctx.db.normalizeId("readings", args.change.clientReadingId);
  const byId = normalized ? await ctx.db.get(normalized) : null;
  const existing =
    byClient ?? (byId && byId.carnetId === args.carnetId ? byId : null);
  const patch = {
    mealId: args.mealId,
    valueMgDl: args.change.valueMgDl,
    context: args.change.context,
    postMealOffset: args.change.postMealOffset,
    takenAt: args.change.takenAt,
    archivedAt: args.change.archivedAt,
    rememberedNote: args.change.rememberedNote,
    recordedBy: args.change.recordedBy ?? args.userId,
    clientId: args.change.clientReadingId,
  };
  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return;
  }
  await ctx.db.insert("readings", {
    userId: args.userId,
    carnetId: args.carnetId,
    createdAt: args.change.createdAt,
    ...patch,
  });
}
