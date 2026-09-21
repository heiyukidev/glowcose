import { filter, find, map, some, trim } from "lodash";

import {
  assignedPhotos,
  findGroupedMeal,
  mealSlotForContext,
  mergeMealNotes,
  mergeMealPhotos,
  photosFromLegacy,
  type MealMatch,
  type MealPhoto,
  type MealSlot,
} from "../../packages/core/src/meal";
import type { ReadingContext } from "../../packages/core/src/glucose";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function requireStoredPhoto(
  ctx: QueryCtx | MutationCtx,
  photoStorageId: Id<"_storage">,
) {
  const url = await ctx.storage.getUrl(photoStorageId);
  if (!url) {
    throw new Error("Photo introuvable");
  }
}

export async function liveMealsForCarnet(
  ctx: QueryCtx | MutationCtx,
  carnetId: Id<"carnets">,
): Promise<Doc<"meals">[]> {
  const rows = await ctx.db
    .query("meals")
    .withIndex("by_carnet", (q) => q.eq("carnetId", carnetId))
    .collect();
  return filter(rows, (row) => !row.archivedAt);
}

export function asStoredPhotos(photos: MealPhoto[]): Doc<"meals">["photos"] {
  return map(photos, (photo) => ({
    ...(photo.storageId
      ? { storageId: photo.storageId as Id<"_storage"> }
      : {}),
    ...(photo.url ? { url: photo.url } : {}),
  }));
}

function toMatch(meal: Doc<"meals">): MealMatch {
  return { id: meal._id, slot: meal.slot, anchorAt: meal.anchorAt };
}

export async function resolvePhotoUrls(
  ctx: QueryCtx | MutationCtx,
  photos: MealPhoto[],
): Promise<MealPhoto[]> {
  return await Promise.all(
    map(photos, async (photo) => {
      if (!photo.storageId) return photo;
      const url = await ctx.storage.getUrl(photo.storageId);
      return { ...photo, url: url ?? photo.url };
    }),
  );
}

async function deleteRemovedPhotos(
  ctx: MutationCtx,
  previous: MealPhoto[],
  next: MealPhoto[],
) {
  const kept = new Set(
    filter(
      map(next, (photo) => photo.storageId as Id<"_storage"> | undefined),
      (id): id is Id<"_storage"> => Boolean(id),
    ),
  );
  for (const photo of previous) {
    if (photo.storageId && !kept.has(photo.storageId as Id<"_storage">)) {
      await ctx.storage.delete(photo.storageId as Id<"_storage">);
    }
  }
}

export async function archiveMealIfEmpty(
  ctx: MutationCtx,
  mealId: Id<"meals">,
  now: number,
) {
  const siblings = await ctx.db
    .query("readings")
    .withIndex("by_meal", (q) => q.eq("mealId", mealId))
    .collect();
  const hasLive = some(siblings, (row) => !row.archivedAt);
  if (hasLive) return;
  const meal = await ctx.db.get(mealId);
  if (meal && !meal.archivedAt) {
    await ctx.db.patch(mealId, { archivedAt: now });
  }
}

export async function attachMeal(
  ctx: MutationCtx,
  args: {
    userId: string;
    carnetId: Id<"carnets">;
    context: ReadingContext;
    takenAt: number;
    note?: string;
    photos?: MealPhoto[];
    now: number;
    mode: "replace" | "lift";
    currentMealId?: Id<"meals">;
    timeZone?: string;
    live?: Doc<"meals">[];
  },
): Promise<{ mealId: Id<"meals">; live: Doc<"meals">[] }> {
  const slot: MealSlot = mealSlotForContext(args.context);
  const live = args.live ?? (await liveMealsForCarnet(ctx, args.carnetId));
  const match = findGroupedMeal(
    map(live, toMatch),
    slot,
    args.takenAt,
    args.context,
    args.timeZone,
  );
  let mealId: Id<"meals"> | undefined = match
    ? (match.id as Id<"meals">)
    : undefined;
  if (slot === "other") {
    mealId =
      args.currentMealId &&
      find(live, (meal) => meal._id === args.currentMealId)?.slot === "other"
        ? args.currentMealId
        : undefined;
  } else if (!mealId && args.currentMealId) {
    const current = find(live, (meal) => meal._id === args.currentMealId);
    if (current && current.slot === slot) {
      const stillFits = findGroupedMeal(
        [toMatch(current)],
        slot,
        args.takenAt,
        args.context,
        args.timeZone,
      );
      if (stillFits) mealId = args.currentMealId;
    }
  }

  const incoming =
    args.photos === undefined ? undefined : assignedPhotos(args.photos);
  if (mealId) {
    const meal = find(live, (item) => item._id === mealId) ?? (await ctx.db.get(mealId));
    if (!meal) {
      throw new Error("Repas introuvable");
    }
    const photos =
      incoming === undefined
        ? meal.photos
        : args.mode === "lift"
          ? mergeMealPhotos(meal.photos, incoming)
          : incoming;
    const note =
      args.note === undefined && args.mode === "replace"
        ? meal.note
        : args.mode === "lift"
          ? mergeMealNotes(meal.note, args.note)
          : trim(args.note ?? "") || undefined;
    if (args.mode === "replace" && incoming !== undefined) {
      await deleteRemovedPhotos(ctx, meal.photos, photos);
    }
    await ctx.db.patch(mealId, {
      photos: asStoredPhotos(photos),
      note,
      archivedAt: undefined,
    });
    const nextMeal = {
      ...meal,
      photos: asStoredPhotos(photos),
      note,
      archivedAt: undefined,
    };
    return {
      mealId,
      live: map(live, (item) => (item._id === mealId ? nextMeal : item)),
    };
  }

  const mealIdNew = await ctx.db.insert("meals", {
    userId: args.userId,
    carnetId: args.carnetId,
    slot,
    anchorAt: args.takenAt,
    note: trim(args.note ?? "") || undefined,
    photos: asStoredPhotos(incoming ?? []),
    createdAt: args.now,
  });
  const created: Doc<"meals"> = {
    _id: mealIdNew,
    _creationTime: args.now,
    userId: args.userId,
    carnetId: args.carnetId,
    slot,
    anchorAt: args.takenAt,
    note: trim(args.note ?? "") || undefined,
    photos: asStoredPhotos(incoming ?? []),
    createdAt: args.now,
  };
  return { mealId: mealIdNew, live: [created, ...live] };
}

export function incomingPhotos(args: {
  photos?: MealPhoto[];
  photoStorageId?: Id<"_storage">;
  photoUrl?: string;
}): MealPhoto[] | undefined {
  if (
    args.photos === undefined &&
    args.photoStorageId === undefined &&
    args.photoUrl === undefined
  ) {
    return undefined;
  }
  return photosFromLegacy({
    photos: args.photos,
    photoStorageId: args.photoStorageId,
    photoUrl: args.photoUrl,
  });
}
