import {
  compact,
  concat,
  every,
  filter,
  find,
  findLast,
  groupBy,
  includes,
  map,
  maxBy,
  minBy,
  orderBy,
  reduce,
  size,
  some,
  take,
  trim,
  uniqBy,
} from "lodash";

import {
  clampNote,
  isAfterContext,
  type MealPhoto,
  type NewReading,
  type PostMealOffset,
  type Reading,
  type ReadingContext,
} from "./glucose";

export type { MealPhoto };

export const MAX_MEAL_PHOTOS = 4;
export const AFTER_MEAL_WINDOW_MS = 12 * 60 * 60 * 1000;

export const MEAL_SLOTS = ["breakfast", "lunch", "dinner", "other"] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export type MealMatch = {
  id: string;
  slot: MealSlot;
  anchorAt: number;
};

export function mealSlotForContext(context: ReadingContext): MealSlot {
  if (context === "other") return "other";
  if (
    includes(["before_breakfast", "after_breakfast"], context)
  ) {
    return "breakfast";
  }
  if (includes(["before_lunch", "after_lunch"], context)) {
    return "lunch";
  }
  return "dinner";
}

export function localDateKey(takenAt: number, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone:
      timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(takenAt));
}

export function findGroupedMeal(
  meals: MealMatch[],
  slot: MealSlot,
  takenAt: number,
  context: ReadingContext,
  timeZone?: string,
): MealMatch | undefined {
  if (slot === "other") return undefined;
  const live = filter(meals, (meal) => meal.slot === slot);
  const day = localDateKey(takenAt, timeZone);
  const sameDay = find(
    live,
    (meal) => localDateKey(meal.anchorAt, timeZone) === day,
  );
  if (sameDay) return sameDay;
  if (!isAfterContext(context)) return undefined;
  const windowStart = takenAt - AFTER_MEAL_WINDOW_MS;
  const inWindow = filter(
    live,
    (meal) => meal.anchorAt >= windowStart && meal.anchorAt <= takenAt,
  );
  return maxBy(inWindow, "anchorAt");
}

export function mergeMealNotes(
  existing?: string,
  incoming?: string,
): string | undefined {
  const previous = trim(existing ?? "");
  const next = trim(incoming ?? "");
  if (!previous) return next || undefined;
  if (!next || previous === next) return previous;
  return `${previous}\n${next}`;
}

function photoKey(photo: MealPhoto): string {
  return photo.storageId ?? photo.url ?? "";
}

export function mergeMealPhotos(
  existing: MealPhoto[],
  incoming: MealPhoto[],
): MealPhoto[] {
  const merged = uniqBy(
    filter(concat(existing, incoming), (photo) => photoKey(photo) !== ""),
    photoKey,
  );
  return take(merged, MAX_MEAL_PHOTOS);
}

export function assignedPhotos(photos?: MealPhoto[]): MealPhoto[] {
  return take(photos ?? [], MAX_MEAL_PHOTOS);
}

export function photosFromLegacy(input: {
  photos?: MealPhoto[];
  photoUrl?: string;
  photoStorageId?: string;
}): MealPhoto[] {
  if (input.photos && input.photos.length > 0) {
    return assignedPhotos(input.photos);
  }
  if (input.photoStorageId || input.photoUrl) {
    return assignedPhotos([
      { storageId: input.photoStorageId, url: input.photoUrl },
    ]);
  }
  return [];
}

export function mealMediaFromMatches(
  meals: Array<MealMatch & { note?: string; photos?: MealPhoto[] }>,
  context: ReadingContext,
  takenAt: number,
  timeZone?: string,
): { note?: string; photos: MealPhoto[] } {
  const slot = mealSlotForContext(context);
  const match = findGroupedMeal(meals, slot, takenAt, context, timeZone);
  if (!match) return { photos: [] };
  const meal = find(meals, (item) => item.id === match.id);
  return {
    note: meal?.note,
    photos: meal?.photos ?? [],
  };
}

export type StoredMeal = {
  _id: string;
  slot: MealSlot;
  anchorAt: number;
  note?: string;
  photos: MealPhoto[];
  createdAt: number;
  archivedAt?: number;
};

export type StoredReading = {
  _id: string;
  userId: string;
  carnetId?: string;
  recordedBy?: string;
  mealId: string;
  valueMgDl: number;
  context: ReadingContext;
  postMealOffset?: PostMealOffset;
  takenAt: number;
  createdAt: number;
  archivedAt?: number;
};

export type LocalLog = {
  meals: StoredMeal[];
  readings: StoredReading[];
};

export function presentStoredReading(
  reading: StoredReading,
  meals: StoredMeal[],
): Reading {
  const meal = find(
    meals,
    (item) => item._id === reading.mealId && !item.archivedAt,
  );
  const photos = meal?.photos ?? [];
  const first = photos[0];
  return {
    ...reading,
    note: meal?.note,
    photos,
    photoUrl: first?.url,
    photoStorageId: first?.storageId,
  };
}

export function presentLocalLog(log: LocalLog): Reading[] {
  return map(
    filter(log.readings, (reading) => !reading.archivedAt),
    (reading) => presentStoredReading(reading, log.meals),
  );
}

function liveMeals(meals: StoredMeal[]): StoredMeal[] {
  return filter(meals, (meal) => !meal.archivedAt);
}

function matchesFromMeals(meals: StoredMeal[]): MealMatch[] {
  return map(liveMeals(meals), (meal) => ({
    id: meal._id,
    slot: meal.slot,
    anchorAt: meal.anchorAt,
  }));
}

function patchMealMedia(
  meal: StoredMeal,
  input: NewReading,
  mode: "replace" | "lift",
): StoredMeal {
  const incoming = photosFromLegacy(input);
  const photos =
    mode === "lift"
      ? mergeMealPhotos(meal.photos, incoming)
      : assignedPhotos(incoming);
  const note =
    mode === "lift"
      ? mergeMealNotes(meal.note, input.note)
      : trim(input.note ?? "") || undefined;
  return { ...meal, photos, note };
}

function archiveEmptyMeals(log: LocalLog, now: number): LocalLog {
  const meals = map(log.meals, (meal) => {
    if (meal.archivedAt) return meal;
    const hasLive = some(
      log.readings,
      (reading) => reading.mealId === meal._id && !reading.archivedAt,
    );
    if (hasLive) return meal;
    return { ...meal, archivedAt: now };
  });
  return { ...log, meals };
}

export function addReadingToLog(
  log: LocalLog,
  input: NewReading,
  meta: { readingId: string; mealId: string; userId: string; now: number },
  mode: "replace" | "lift" = "replace",
): LocalLog {
  input = { ...input, note: clampNote(input.note) };
  const slot = mealSlotForContext(input.context);
  const match = findGroupedMeal(
    matchesFromMeals(log.meals),
    slot,
    input.takenAt,
    input.context,
  );
  let meals = log.meals;
  let mealId = match?.id;
  if (mealId) {
    meals = map(meals, (meal) =>
      meal._id === mealId ? patchMealMedia(meal, input, mode) : meal,
    );
  } else {
    mealId = meta.mealId;
    meals = [
      {
        _id: mealId,
        slot,
        anchorAt: input.takenAt,
        note: trim(input.note ?? "") || undefined,
        photos: photosFromLegacy(input),
        createdAt: meta.now,
      },
      ...meals,
    ];
  }
  const reading: StoredReading = {
    _id: meta.readingId,
    userId: meta.userId,
    mealId,
    valueMgDl: input.valueMgDl,
    context: input.context,
    postMealOffset: input.postMealOffset,
    takenAt: input.takenAt,
    createdAt: meta.now,
    archivedAt: undefined,
  };
  return {
    meals,
    readings: [reading, ...log.readings],
  };
}

export function updateReadingInLog(
  log: LocalLog,
  id: string,
  input: NewReading,
  meta: { mealId: string; now: number },
): LocalLog {
  const existing = find(log.readings, (reading) => reading._id === id);
  if (!existing || existing.archivedAt) return log;
  const slot = mealSlotForContext(input.context);
  const previousSlot = mealSlotForContext(existing.context);
  const match = findGroupedMeal(
    matchesFromMeals(log.meals),
    slot,
    input.takenAt,
    input.context,
  );
  let mealId = match?.id;
  if (slot === "other") {
    mealId = previousSlot === "other" ? existing.mealId : meta.mealId;
  } else if (!mealId && previousSlot === slot) {
    const currentMeal = find(
      liveMeals(log.meals),
      (meal) => meal._id === existing.mealId,
    );
    const stillFits = currentMeal
      ? findGroupedMeal(
          [
            {
              id: currentMeal._id,
              slot: currentMeal.slot,
              anchorAt: currentMeal.anchorAt,
            },
          ],
          slot,
          input.takenAt,
          input.context,
        )
      : undefined;
    mealId = stillFits ? existing.mealId : meta.mealId;
  } else if (!mealId) {
    mealId = meta.mealId;
  }
  let meals = log.meals;
  const mealExists = some(meals, (meal) => meal._id === mealId);
  if (mealExists) {
    meals = map(meals, (meal) => {
      if (meal._id !== mealId) return meal;
      return {
        ...patchMealMedia({ ...meal, archivedAt: undefined }, input, "replace"),
        slot,
        archivedAt: undefined,
      };
    });
  } else {
    meals = [
      {
        _id: mealId,
        slot,
        anchorAt: input.takenAt,
        note: trim(input.note ?? "") || undefined,
        photos: photosFromLegacy(input),
        createdAt: meta.now,
      },
      ...meals,
    ];
  }
  const readings = map(log.readings, (reading) =>
    reading._id === id
      ? {
          ...reading,
          mealId,
          valueMgDl: input.valueMgDl,
          context: input.context,
          postMealOffset: input.postMealOffset,
          takenAt: input.takenAt,
        }
      : reading,
  );
  return archiveEmptyMeals({ meals, readings }, meta.now);
}

export function archiveReadingInLog(
  log: LocalLog,
  id: string,
  now: number,
): LocalLog {
  const readings = map(log.readings, (reading) =>
    reading._id === id ? { ...reading, archivedAt: now } : reading,
  );
  return archiveEmptyMeals({ ...log, readings }, now);
}

export function hydrateLocalLog(raw: unknown, userId: string): LocalLog {
  if (
    raw &&
    typeof raw === "object" &&
    "v" in raw &&
    (raw as { v?: number }).v === 3 &&
    "meals" in raw &&
    "readings" in raw
  ) {
    const bundle = raw as LocalLog & { v: number };
    return { meals: bundle.meals ?? [], readings: bundle.readings ?? [] };
  }
  if (!Array.isArray(raw)) {
    return { meals: [], readings: [] };
  }
  const chronological = orderBy(raw as Reading[], ["takenAt"], ["asc"]);
  const empty: LocalLog = { meals: [], readings: [] };
  return reduce(
    chronological,
    (log, row) => {
      const next = addReadingToLog(
        log,
        {
          valueMgDl: row.valueMgDl,
          context: row.context,
          postMealOffset: row.postMealOffset,
          note: row.note,
          photos: row.photos,
          photoUrl: row.photoUrl,
          photoStorageId: row.photoStorageId,
          takenAt: row.takenAt,
        },
        {
          readingId: String(row._id),
          mealId: row.mealId ?? `meal-${row._id}`,
          userId: row.userId || userId,
          now: row.createdAt,
        },
        "lift",
      );
      if (row.archivedAt) {
        return archiveReadingInLog(next, String(row._id), row.archivedAt);
      }
      return next;
    },
    empty,
  );
}

export function serializeLocalLog(log: LocalLog): string {
  return JSON.stringify({ v: 3, meals: log.meals, readings: log.readings });
}

export function mealMediaForForm(
  readings: Reading[],
  context: ReadingContext,
  takenAt: number,
  excludeId?: string,
): { note?: string; photos: MealPhoto[] } {
  const candidates = filter(
    readings,
    (reading) => !reading.archivedAt && reading._id !== excludeId,
  );
  const meals = map(candidates, (reading) => ({
    id: reading.mealId ?? reading._id,
    slot: mealSlotForContext(reading.context),
    anchorAt: reading.takenAt,
    note: reading.note,
    photos: photosFromLegacy(reading),
  }));
  return mealMediaFromMatches(meals, context, takenAt);
}

export function formMealKey(
  readings: Reading[],
  context: ReadingContext,
  takenAt: number,
  initial?: Pick<Reading, "_id" | "context" | "mealId">,
): string {
  const slot = mealSlotForContext(context);
  if (slot === "other") {
    if (initial && initial.context === "other" && context === "other") {
      return `meal:${initial.mealId ?? initial._id}`;
    }
    return "new:other";
  }
  const mediaReadings = filter(
    readings,
    (reading) => !reading.archivedAt,
  );
  const meals = map(mediaReadings, (reading) => ({
    id: reading.mealId ?? reading._id,
    slot: mealSlotForContext(reading.context),
    anchorAt: reading.takenAt,
  }));
  const match = findGroupedMeal(meals, slot, takenAt, context);
  if (match) return `meal:${match.id}`;
  return `new:${slot}:${localDateKey(takenAt)}`;
}

/** Pending = picked on device/browser, not uploaded to Convex yet. */
export function isPendingFormPhoto(photo: {
  blob?: unknown;
  localUri?: string;
}): boolean {
  return Boolean(photo.blob || photo.localUri);
}

/**
 * When the form rebinds to another Meal, keep photos the member just picked.
 * Without this, changing contexte/heure after Galerie wipes the selection.
 */
export function photosAfterMealChange<
  T extends {
    blob?: unknown;
    localUri?: string;
    url?: string;
    storageId?: string;
  },
>(current: T[], mealPhotosAsForm: T[]): T[] {
  const pending = filter(current, isPendingFormPhoto);
  return take(concat(mealPhotosAsForm, pending), MAX_MEAL_PHOTOS);
}

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
  other: "Autre",
};

const MEAL_SLOT_RANK: Record<MealSlot, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  other: 3,
};

export type MealSection = {
  id: string;
  slot: MealSlot;
  label: string;
  note?: string;
  photos: MealPhoto[];
  readings: Reading[];
};

function readingPhase(reading: Reading): number {
  if (!isAfterContext(reading.context)) return 0;
  if (reading.postMealOffset === 1) return 2;
  if (reading.postMealOffset === 2) return 3;
  return 1;
}

function sectionNote(readings: Reading[]): string | undefined {
  const withNote = find(readings, (item) => trim(item.note ?? "") !== "");
  const text = trim(withNote?.note ?? "");
  return text || undefined;
}

function sectionPhotos(readings: Reading[]): MealPhoto[] {
  const withPhotos = find(
    readings,
    (item) => size(photosFromLegacy(item)) > 0,
  );
  return withPhotos ? photosFromLegacy(withPhotos) : [];
}

function sectionAnchor(section: MealSection): number {
  return minBy(section.readings, "takenAt")?.takenAt ?? 0;
}

function isAfterOnly(section: MealSection): boolean {
  return (
    size(section.readings) > 0 &&
    every(section.readings, (reading) => isAfterContext(reading.context))
  );
}

/**
 * A before and its after were sometimes stored as two meals, so the day
 * showed "Petit-déjeuner" twice. Fold an after-only meal into the earlier
 * meal of the same slot when it falls in that meal's window.
 * A later meal that starts with "Avant" stays its own group, as does "Autre".
 */
function foldSplitAfterMeals(sections: MealSection[]): MealSection[] {
  const ordered = orderBy(
    sections,
    [(section) => MEAL_SLOT_RANK[section.slot], sectionAnchor],
    ["asc", "asc"],
  );
  return reduce(
    ordered,
    (acc, section) => {
      if (section.slot === "other" || !isAfterOnly(section)) {
        return concat(acc, [section]);
      }
      const anchorAt = sectionAnchor(section);
      const host = findLast(acc, (existing) => {
        if (existing.slot !== section.slot) return false;
        const hostAt = sectionAnchor(existing);
        return anchorAt >= hostAt && anchorAt - hostAt <= AFTER_MEAL_WINDOW_MS;
      });
      if (!host) return concat(acc, [section]);
      const readings = orderBy(
        concat(host.readings, section.readings),
        [readingPhase, "takenAt"],
        ["asc", "asc"],
      );
      const note = sectionNote(readings);
      const next: MealSection = {
        ...host,
        ...(note ? { note } : {}),
        photos: mergeMealPhotos(host.photos, section.photos),
        readings,
      };
      return map(acc, (item) => (item.id === host.id ? next : item));
    },
    [] as MealSection[],
  );
}

export function groupReadingsByMeal(readings: Reading[]): MealSection[] {
  const live = filter(readings, (reading) => !reading.archivedAt);
  const grouped = groupBy(
    live,
    (reading) => reading.mealId ?? `reading:${reading._id}`,
  );
  const sections = compact(
    map(grouped, (items, id) => {
      const ordered = orderBy(items, [readingPhase, "takenAt"], ["asc", "asc"]);
      const head = ordered[0];
      if (!head) return null;
      const slot = mealSlotForContext(head.context);
      const note = sectionNote(ordered);
      return {
        id,
        slot,
        label: MEAL_SLOT_LABELS[slot],
        ...(note ? { note } : {}),
        photos: sectionPhotos(ordered),
        readings: ordered,
      };
    }),
  );
  return foldSplitAfterMeals(sections);
}

/** Named meal slots always shown on Aujourd’hui, even with no Readings. */
export const DEFAULT_DAY_MEAL_SLOTS = [
  "breakfast",
  "lunch",
  "dinner",
] as const;
export type DefaultDayMealSlot = (typeof DEFAULT_DAY_MEAL_SLOTS)[number];

export type MealCardSide = "before" | "after";

export type MealCardModel = {
  id: string;
  slot: DefaultDayMealSlot;
  label: string;
  note?: string;
  photos: MealPhoto[];
  before?: Reading;
  after?: Reading;
  isShell: boolean;
};

export function contextForMealSide(
  slot: DefaultDayMealSlot,
  side: MealCardSide,
): ReadingContext {
  if (slot === "breakfast") {
    return side === "before" ? "before_breakfast" : "after_breakfast";
  }
  if (slot === "lunch") {
    return side === "before" ? "before_lunch" : "after_lunch";
  }
  return side === "before" ? "before_dinner" : "after_dinner";
}

export function pickBeforeReading(
  readings: Reading[],
): Reading | undefined {
  return find(
    readings,
    (reading) => !isAfterContext(reading.context) && reading.context !== "other",
  );
}

/** Prefer the 2h after Reading; fall back to 1h, then any after. */
export function pickAfterReading(
  readings: Reading[],
): Reading | undefined {
  const afters = filter(readings, (reading) =>
    isAfterContext(reading.context),
  );
  const at2h = find(afters, (reading) => reading.postMealOffset === 2);
  if (at2h) return at2h;
  const at1h = find(afters, (reading) => reading.postMealOffset === 1);
  if (at1h) return at1h;
  return afters[0];
}

function mealCardFromSection(section: MealSection): MealCardModel | null {
  if (section.slot === "other") return null;
  const before = pickBeforeReading(section.readings);
  const after = pickAfterReading(section.readings);
  return {
    id: section.id,
    slot: section.slot,
    label: section.label,
    ...(section.note ? { note: section.note } : {}),
    photos: section.photos,
    ...(before ? { before } : {}),
    ...(after ? { after } : {}),
    isShell: false,
  };
}

function emptyMealShell(slot: DefaultDayMealSlot): MealCardModel {
  return {
    id: `shell:${slot}`,
    slot,
    label: MEAL_SLOT_LABELS[slot],
    photos: [],
    isShell: true,
  };
}

/**
 * Always three named meal cards (Petit-déj / Déjeuner / Dîner), plus any
 * leftover sections (Autre, or a second named meal on rare days).
 * Empty slots are virtual shells — no Meal is created until a Reading lands.
 */
export function todayMealCards(readings: Reading[]): {
  meals: MealCardModel[];
  extras: MealSection[];
} {
  const sections = groupReadingsByMeal(readings);
  const claimed = new Set<string>();
  const meals: MealCardModel[] = map([...DEFAULT_DAY_MEAL_SLOTS], (slot) => {
    const section = find(
      sections,
      (item) => item.slot === slot && !claimed.has(item.id),
    );
    if (!section) return emptyMealShell(slot);
    claimed.add(section.id);
    return mealCardFromSection(section) ?? emptyMealShell(slot);
  });
  const extras = filter(sections, (section) => !claimed.has(section.id));
  return { meals, extras };
}
