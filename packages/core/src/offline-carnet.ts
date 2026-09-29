import {
  cloneDeep,
  compact,
  filter,
  find,
  flatMap,
  includes,
  map,
  reject,
  some,
  sortBy,
  take,
  uniqBy,
} from "lodash";

import { assertSavableReading, clampNote, type NewReading, type Reading } from "./glucose";
import {
  addReadingToLog,
  archiveReadingInLog,
  localDateKey,
  mealSlotForContext,
  type LocalLog,
  type MealPhoto,
  type MealSlot,
  type StoredMeal,
  type StoredReading,
  MAX_MEAL_PHOTOS,
  presentLocalLog,
  presentStoredReading,
  updateReadingInLog,
} from "./meal";

export type OpenClash = {
  id: string;
  kind: "catch-up" | "restore" | "note";
  localReadingId: string;
  sharedReading: StoredReading;
  sharedMeal: StoredMeal;
};

export type OutboundChange = {
  reading: StoredReading;
  meal: StoredMeal;
};

export type DeviceCarnet = {
  base: LocalLog | null;
  local: LocalLog;
  clashes: OpenClash[];
  pending: OutboundChange[];
  settled: string[];
};

export type ClashView = {
  id: string;
  mine: Reading;
  shared: Reading;
};

export type CarnetView = {
  readings: Reading[];
  clashes: ClashView[];
  archived: Reading[];
};

export type RecordCommand =
  | { kind: "save"; input: NewReading }
  | { kind: "update"; id: string; input: NewReading }
  | { kind: "archive"; id: string }
  | { kind: "restore"; id: string }
  | { kind: "apply-note"; mealId: string };

export type RecordMeta = {
  readingId: string;
  mealId: string;
  userId: string;
  now: number;
  recordedBy: string;
  timeZone: string;
  archivedReadingId: string;
};

export type CatchUpResult = {
  device: DeviceCarnet;
  outbound: OutboundChange[];
};

export type SignOutResult =
  | {
      status: "stay";
      reason: "offline" | "clash";
      device: DeviceCarnet;
      outbound: OutboundChange[];
    }
  | { status: "clear"; outbound: OutboundChange[] };

const EMPTY_LOG: LocalLog = { meals: [], readings: [] };

export function emptyDeviceCarnet(): DeviceCarnet {
  return {
    base: null,
    local: cloneDeep(EMPTY_LOG),
    clashes: [],
    pending: [],
    settled: [],
  };
}

export function view(device: DeviceCarnet): CarnetView {
  if (!device.base) {
    return { readings: [], clashes: [], archived: [] };
  }
  return {
    readings: presentLocalLog(device.local),
    clashes: compact(
      map(device.clashes, (clash) => {
        if (
          device.base &&
          (clash.kind === "catch-up" || clash.kind === "note") &&
          !diverged(
            device.local,
            findReading(device.local, clash.localReadingId),
            device.base,
            findReading(device.base, clash.localReadingId),
          )
        ) {
          return null;
        }
        return {
          id: clash.id,
          mine: presentClaim(device.local, clash.localReadingId),
          shared: presentStoredReading(clash.sharedReading, [clash.sharedMeal]),
        };
      }),
    ),
    archived: map(
      filter(device.local.readings, (reading) => {
        if (!reading.archivedAt || !device.base) return false;
        return !findReading(device.base, reading._id)?.archivedAt;
      }),
      (reading) => {
        const presented = presentStoredReading(reading, device.local.meals);
        return reading.rememberedNote
          ? { ...presented, note: reading.rememberedNote }
          : presented;
      },
    ),
  };
}

export function record(
  device: DeviceCarnet,
  command: RecordCommand,
  meta: RecordMeta,
): DeviceCarnet {
  if (!device.base) return device;
  if (command.kind === "save" || command.kind === "update") {
    assertSavableReading(command.input);
  }
  if (command.kind === "restore") {
    return restoreReading(device, command.id, meta);
  }
  return { ...device, local: applyCommand(device.local, command, meta) };
}

export function catchUp(
  device: DeviceCarnet,
  shared: LocalLog | null,
  timeZone: string,
): CatchUpResult {
  if (!shared) {
    return { device, outbound: device.pending };
  }
  if (!device.base) {
    const seeded = cloneDeep(shared);
    return {
      device: {
        base: seeded,
        local: cloneDeep(seeded),
        clashes: [],
        pending: [],
        settled: [],
      },
      outbound: [],
    };
  }

  let local = retargetMeals(device.local, shared, timeZone);
  const base = device.base;
  let pending = filter(device.pending, (change) => !reflects(shared, change));
  let settled = [...device.settled];
  const clashes = reject(device.clashes, (clash) => clash.kind === "catch-up");

  const localClaims = claims(local, timeZone);
  const sharedClaims = claims(shared, timeZone);
  const baseClaims = claims(base, timeZone);
  const keys = uniqSorted([
    ...localClaims.keys(),
    ...sharedClaims.keys(),
    ...baseClaims.keys(),
  ]);

  for (const key of keys) {
    if (includes(settled, key) || some(device.clashes, (clash) => clash.kind === "restore" && clash.id === key)) {
      continue;
    }
    const mine = localClaims.get(key);
    const theirs = sharedClaims.get(key);
    const previous = baseClaims.get(key);
    const localChanged = Boolean(mine) && diverged(local, mine, base, previous);
    const sharedChanged = Boolean(theirs) && diverged(shared, theirs, base, previous);
    if (
      mine &&
      theirs &&
      localChanged &&
      sharedChanged &&
      contentConflicts(local, shared, mine, theirs)
    ) {
      clashes.push({
        id: key,
        kind: noteOnly(local, shared, mine, theirs) ? "note" : "catch-up",
        localReadingId: mine._id,
        sharedReading: theirs,
        sharedMeal: mealOf(shared, theirs) ?? emptyMeal(theirs),
      });
      continue;
    }
    if (mine && theirs && mine._id !== theirs._id) {
      local = adoptSharedClaim(local, shared, mine, theirs);
      continue;
    }
    if (mine && !sameReading(mine, previous) && !theirs) {
      pending = enqueue(pending, changeFor(local, mine));
      continue;
    }
    if (theirs && sharedChanged && !localChanged) {
      local = adoptSharedClaim(local, shared, mine, theirs);
      continue;
    }
    if (mine && theirs) {
      local = adoptSharedPhotos(local, shared, mine, theirs, base, previous);
      const current = findReading(local, mine._id) ?? mine;
      if (!reflects(shared, changeFor(local, current))) {
        pending = enqueue(pending, changeFor(local, current));
      }
    }
  }

  pending = enqueueArchives(pending, local, base, shared, timeZone);
  settled = filter(settled, (key) => !sharedMatchesLocal(local, shared, key, timeZone));

  const next: DeviceCarnet = {
    base: acknowledge(base, shared, local, pending, clashes, settled, timeZone),
    local,
    clashes,
    pending,
    settled,
  };
  return { device: next, outbound: pending };
}

export function choose(
  device: DeviceCarnet,
  clashId: string,
  choice: "keep" | "drop",
  meta: { now: number; archivedReadingId: string },
): DeviceCarnet {
  const clash = find(device.clashes, (item) => item.id === clashId);
  if (!clash || !device.base) return device;
  const localReading = findReading(device.local, clash.localReadingId);
  if (!localReading) return device;
  if (clash.kind === "note") {
    return chooseNote(device, clash, choice);
  }

  let local = cloneDeep(device.local);
  const sameReadingId = localReading._id === clash.sharedReading._id;
  const localMeal = mealOf(local, localReading);
  const sharedNote = clash.sharedMeal.note;
  const localNote = localMeal?.note;

  if (choice === "keep") {
    if (localReading.archivedAt) {
      local = revive(local, localReading._id);
    }
    if (!sameReadingId) {
      local = upsertArchived(local, {
        ...clash.sharedReading,
        archivedAt: meta.now,
        rememberedNote: sharedNote !== localNote ? sharedNote : undefined,
        mealId: localReading.mealId,
      });
    } else {
      local = upsertArchived(local, {
        ...clash.sharedReading,
        _id: meta.archivedReadingId,
        archivedAt: meta.now,
        rememberedNote: sharedNote !== localNote ? sharedNote : undefined,
        mealId: localReading.mealId,
      });
    }
    if (localMeal && sharedNote !== localNote) {
      local = rememberMealNote(local, localReading.mealId, sharedNote);
    }
  } else {
    const remembered = localNote !== sharedNote ? localNote : undefined;
    if (!sameReadingId) {
      local = archiveInPlace(local, localReading._id, meta.now, remembered);
      local = adoptReading(local, {
        ...clash.sharedReading,
        mealId: mealOf(local, clash.sharedReading)?._id ?? clash.sharedMeal._id,
        archivedAt: undefined,
      }, clash.sharedMeal);
    } else {
      local = upsertArchived(local, {
        ...localReading,
        _id: meta.archivedReadingId,
        archivedAt: meta.now,
        rememberedNote: remembered,
      });
      local = replaceValue(local, localReading._id, clash.sharedReading, clash.sharedMeal);
    }
  }

  const pending = enqueueChoice(device.pending, local, choice, clash, localReading, meta, sameReadingId);

  return {
    ...device,
    local,
    clashes: reject(device.clashes, (item) => item.id === clashId),
    settled: uniqSorted([...device.settled, clash.id]),
    pending,
  };
}

export function dismissArchive(device: DeviceCarnet, readingId: string): DeviceCarnet {
  if (!device.base) return device;
  const reading = findReading(device.local, readingId);
  if (!reading?.archivedAt) return device;
  const previous = findReading(device.base, readingId);
  const readings = previous
    ? map(device.base.readings, (item) =>
        item._id === readingId ? { ...item, archivedAt: reading.archivedAt } : item,
      )
    : [...device.base.readings, reading];
  return { ...device, base: { ...device.base, readings } };
}

export function usesUnsignedJournal(device: DeviceCarnet, authenticated: boolean): boolean {
  return !authenticated && device.base === null;
}

export function signOut(
  device: DeviceCarnet,
  shared: LocalLog | null,
  timeZone: string,
): SignOutResult {
  if (!shared || !device.base) {
    return { status: "stay", reason: "offline", device, outbound: device.pending };
  }
  const caught = catchUp(device, shared, timeZone);
  if (caught.device.clashes.length > 0) {
    return {
      status: "stay",
      reason: "clash",
      device: caught.device,
      outbound: caught.outbound,
    };
  }
  return { status: "clear", outbound: caught.outbound };
}

function applyCommand(
  log: LocalLog,
  command: RecordCommand,
  meta: RecordMeta,
): LocalLog {
  if (command.kind === "save") {
    const input = { ...command.input, note: clampNote(command.input.note) };
    let next = addReadingToLog(log, input, meta);
    next = stampAuthor(next, meta.readingId, meta.recordedBy);
    return holdExtraPhotos(next, meta.readingId, command.input.photos);
  }
  if (command.kind === "update") {
    const input = { ...command.input, note: clampNote(command.input.note) };
    const next = updateReadingInLog(log, command.id, input, meta);
    return holdExtraPhotos(next, command.id, command.input.photos);
  }
  if (command.kind === "archive") {
    return archiveReadingInLog(log, command.id, meta.now);
  }
  if (command.kind === "apply-note") {
    return {
      ...log,
      meals: map(log.meals, (item) => {
        if (item._id !== command.mealId || !item.rememberedNote) return item;
        return { ...item, note: item.rememberedNote, rememberedNote: item.note };
      }),
    };
  }
  const restored = findReading(log, command.id);
  if (!restored?.archivedAt) return log;
  const occupant = liveClaim(log, restored, meta.timeZone);
  if (!occupant || occupant._id === restored._id) {
    return revive(log, restored._id);
  }
  return log;
}

function presentClaim(log: LocalLog, readingId: string): Reading {
  const reading = findReading(log, readingId);
  if (!reading) {
    return {
      _id: readingId,
      userId: "",
      valueMgDl: 0,
      context: "other",
      takenAt: 0,
      createdAt: 0,
    };
  }
  const presented = presentStoredReading(reading, log.meals);
  return reading.rememberedNote
    ? { ...presented, note: reading.rememberedNote }
    : presented;
}

function claims(log: LocalLog, timeZone: string): Map<string, StoredReading> {
  const result = new Map<string, StoredReading>();
  for (const reading of filter(log.readings, (item) => !item.archivedAt)) {
    const key = claimKey(log, reading, timeZone);
    if (key) result.set(key, reading);
  }
  return result;
}

function claimKey(
  log: LocalLog,
  reading: StoredReading,
  timeZone: string,
): string | undefined {
  const meal = mealOf(log, reading);
  if (!meal || meal.archivedAt) return undefined;
  const phase = reading.postMealOffset
    ? `${reading.context}:${reading.postMealOffset}`
    : reading.context;
  if (meal.slot === "other") return `other:${meal._id}:${phase}`;
  return `${meal.slot}:${localDateKey(meal.anchorAt, timeZone)}:${phase}`;
}

function liveClaim(
  log: LocalLog,
  reading: StoredReading,
  timeZone: string,
): StoredReading | undefined {
  const meal = mealOf(log, reading);
  if (!meal) return undefined;
  const probe = { ...reading, archivedAt: undefined, mealId: meal._id };
  const key = claimKey({ ...log, meals: map(log.meals, (item) => item._id === meal._id ? { ...item, archivedAt: undefined } : item) }, probe, timeZone);
  if (!key) return undefined;
  return claims(
    {
      ...log,
      meals: map(log.meals, (item) =>
        item._id === meal._id ? { ...item, archivedAt: undefined } : item,
      ),
    },
    timeZone,
  ).get(key);
}

function restoreReading(
  device: DeviceCarnet,
  readingId: string,
  meta: RecordMeta,
): DeviceCarnet {
  const restored = findReading(device.local, readingId);
  if (!restored?.archivedAt) return device;
  const occupant = liveClaim(device.local, restored, meta.timeZone);
  if (!occupant || occupant._id === restored._id) {
    return { ...device, local: revive(device.local, readingId) };
  }
  const key = claimKey(
    {
      ...device.local,
      meals: map(device.local.meals, (item) =>
        item._id === restored.mealId ? { ...item, archivedAt: undefined } : item,
      ),
    },
    { ...restored, archivedAt: undefined },
    meta.timeZone,
  );
  const meal = mealOf(device.local, occupant) ?? emptyMeal(occupant);
  return {
    ...device,
    clashes: [
      ...reject(device.clashes, (clash) => clash.id === key),
      {
        id: key ?? readingId,
        kind: "restore",
        localReadingId: restored._id,
        sharedReading: occupant,
        sharedMeal: meal,
      },
    ],
  };
}

function enqueueChoice(
  pending: OutboundChange[],
  local: LocalLog,
  choice: "keep" | "drop",
  clash: OpenClash,
  localReading: StoredReading,
  meta: { archivedReadingId: string },
  sameReadingId: boolean,
): OutboundChange[] {
  if (choice === "keep") {
    const live = findReading(local, localReading._id);
    const archivedId = sameReadingId ? meta.archivedReadingId : clash.sharedReading._id;
    const archived = findReading(local, archivedId);
    let next = pending;
    if (live && !live.archivedAt) next = enqueue(next, changeFor(local, live));
    if (archived?.archivedAt) next = enqueue(next, changeFor(local, archived));
    return next;
  }
  const archivedId = sameReadingId ? meta.archivedReadingId : localReading._id;
  const archived = findReading(local, archivedId);
  if (!archived?.archivedAt) return pending;
  return enqueue(pending, changeFor(local, archived));
}

function chooseNote(
  device: DeviceCarnet,
  clash: OpenClash,
  choice: "keep" | "drop",
): DeviceCarnet {
  const localReading = findReading(device.local, clash.localReadingId);
  if (!localReading) return device;
  const current = mealOf(device.local, localReading)?.note;
  const other = clash.sharedMeal.note;
  const note = choice === "keep" ? current : other;
  const remembered = choice === "keep" ? other : current;
  const local = {
    ...device.local,
    meals: map(device.local.meals, (meal) =>
      meal._id === localReading.mealId
        ? { ...meal, note, rememberedNote: remembered }
        : meal,
    ),
  };
  const live = findReading(local, localReading._id);
  return {
    ...device,
    local,
    clashes: reject(device.clashes, (item) => item.id === clash.id),
    settled: uniqSorted([...device.settled, clash.id]),
    pending: live ? enqueue(device.pending, changeFor(local, live)) : device.pending,
  };
}

function noteOnly(
  local: LocalLog,
  shared: LocalLog,
  mine: StoredReading,
  theirs: StoredReading,
): boolean {
  return (
    mine._id === theirs._id &&
    mine.valueMgDl === theirs.valueMgDl &&
    mine.context === theirs.context &&
    (mine.postMealOffset ?? null) === (theirs.postMealOffset ?? null) &&
    noteOf(local, mine) !== noteOf(shared, theirs)
  );
}

function diverged(
  log: LocalLog,
  reading: StoredReading | undefined,
  base: LocalLog,
  previous: StoredReading | undefined,
): boolean {
  if (!reading || !previous) return Boolean(reading) !== Boolean(previous);
  if (!sameReading(reading, previous)) return true;
  return noteOf(log, reading) !== noteOf(base, previous);
}

function contentConflicts(
  local: LocalLog,
  shared: LocalLog,
  mine: StoredReading,
  theirs: StoredReading,
): boolean {
  return (
    mine.valueMgDl !== theirs.valueMgDl ||
    mine.context !== theirs.context ||
    (mine.postMealOffset ?? null) !== (theirs.postMealOffset ?? null) ||
    noteOf(local, mine) !== noteOf(shared, theirs)
  );
}

function identical(
  local: LocalLog,
  shared: LocalLog,
  mine: StoredReading,
  theirs: StoredReading,
): boolean {
  return (
    mine.valueMgDl === theirs.valueMgDl &&
    mine.context === theirs.context &&
    (mine.postMealOffset ?? null) === (theirs.postMealOffset ?? null) &&
    noteOf(local, mine) === noteOf(shared, theirs) &&
    photoKeys(photosOf(local, mine)) === photoKeys(photosOf(shared, theirs))
  );
}

function sameReading(
  reading: StoredReading | undefined,
  other: StoredReading | undefined,
): boolean {
  if (!reading && !other) return true;
  if (!reading || !other) return false;
  return (
    reading._id === other._id &&
    reading.valueMgDl === other.valueMgDl &&
    reading.context === other.context &&
    (reading.postMealOffset ?? null) === (other.postMealOffset ?? null) &&
    reading.takenAt === other.takenAt &&
    Boolean(reading.archivedAt) === Boolean(other.archivedAt)
  );
}

function noteChanged(local: LocalLog, base: LocalLog, reading: StoredReading): boolean {
  const previous = findReading(base, reading._id);
  if (!previous) return false;
  return noteOf(local, reading) !== noteOf(base, previous);
}

function retargetMeals(local: LocalLog, shared: LocalLog, timeZone: string): LocalLog {
  let meals = [...local.meals];
  let readings = [...local.readings];
  for (const item of filter(local.meals, (meal) => !meal.archivedAt && meal.slot !== "other")) {
    const sharedMeal = find(
      shared.meals,
      (candidate) =>
        !candidate.archivedAt &&
        candidate.slot === item.slot &&
        localDateKey(candidate.anchorAt, timeZone) === localDateKey(item.anchorAt, timeZone),
    );
    if (!sharedMeal || sharedMeal._id === item._id) continue;
    readings = map(readings, (reading) =>
      reading.mealId === item._id ? { ...reading, mealId: sharedMeal._id } : reading,
    );
    if (!some(meals, (meal) => meal._id === sharedMeal._id)) {
      meals = [
        ...meals,
        {
          ...sharedMeal,
          note: item.note,
          photos: item.photos,
          rememberedNote: item.rememberedNote,
        },
      ];
    }
    meals = map(meals, (meal) =>
      meal._id === item._id ? { ...meal, archivedAt: meal.anchorAt } : meal,
    );
  }
  return { meals, readings };
}

function adoptSharedClaim(
  local: LocalLog,
  shared: LocalLog,
  mine: StoredReading | undefined,
  theirs: StoredReading,
): LocalLog {
  let next = local;
  if (mine && mine._id !== theirs._id) {
    next = {
      ...next,
      readings: reject(next.readings, (reading) => reading._id === mine._id),
    };
  }
  return adoptReading(next, { ...theirs, archivedAt: undefined }, mealOf(shared, theirs));
}

function adoptSharedPhotos(
  local: LocalLog,
  shared: LocalLog,
  mine: StoredReading,
  theirs: StoredReading,
  base: LocalLog,
  previous: StoredReading | undefined,
): LocalLog {
  const localMeal = mealOf(local, mine);
  const sharedMeal = mealOf(shared, theirs);
  const baseMeal = previous ? mealOf(base, previous) : undefined;
  if (!localMeal || !sharedMeal) return local;
  const photos = reconcilePhotos(
    baseMeal?.photos ?? [],
    localMeal.photos,
    sharedMeal.photos,
  );
  return {
    ...local,
    meals: map(local.meals, (meal) =>
      meal._id === localMeal._id ? { ...meal, photos } : meal,
    ),
  };
}

function reconcilePhotos(
  base: MealPhoto[],
  localPhotos: MealPhoto[],
  sharedPhotos: MealPhoto[],
): MealPhoto[] {
  const removed = new Set(
    map(
      filter(base, (photo) => !includes(map(localPhotos, photoKey), photoKey(photo))),
      photoKey,
    ),
  );
  const kept = filter(sharedPhotos, (photo) => !removed.has(photoKey(photo)));
  const added = filter(
    localPhotos,
    (photo) => !includes(map(base, photoKey), photoKey(photo)),
  );
  return [...kept, ...added];
}

function enqueueArchives(
  pending: OutboundChange[],
  local: LocalLog,
  base: LocalLog,
  shared: LocalLog,
  timeZone: string,
): OutboundChange[] {
  let next = pending;
  for (const reading of local.readings) {
    if (!reading.archivedAt) continue;
    const key = claimKey(
      { ...local, meals: map(local.meals, (meal) => ({ ...meal, archivedAt: undefined })), readings: map(local.readings, (item) => item._id === reading._id ? { ...item, archivedAt: undefined } : item) },
      { ...reading, archivedAt: undefined },
      timeZone,
    );
    if (!key) continue;
    const onShared = findReading(shared, reading._id);
    const onBase = findReading(base, reading._id);
    if (onShared?.archivedAt) continue;
    if (!onBase || onBase.archivedAt) continue;
    const meal = mealOf(local, reading) ?? emptyMeal(reading);
    next = enqueue(next, { reading, meal });
  }
  return next;
}

function sharedMatchesLocal(
  local: LocalLog,
  shared: LocalLog,
  key: string,
  timeZone: string,
): boolean {
  const mine = claims(local, timeZone).get(key);
  const theirs = claims(shared, timeZone).get(key);
  if (!mine && !theirs) return true;
  if (!mine || !theirs) return false;
  return identical(local, shared, mine, theirs) && mine._id === theirs._id;
}

function acknowledge(
  base: LocalLog,
  shared: LocalLog,
  local: LocalLog,
  pending: OutboundChange[],
  clashes: OpenClash[],
  settled: string[],
  timeZone: string,
): LocalLog {
  const blocked = new Set([
    ...settled,
    ...map(clashes, (clash) => clash.id),
    ...flatMap(pending, (change) => {
      const key = claimKey(local, change.reading, timeZone);
      return key ? [key] : [];
    }),
  ]);
  let next = cloneDeep(shared);
  for (const key of blocked) {
    const previous = claims(base, timeZone).get(key);
    const sharedReading = claims(shared, timeZone).get(key);
    if (sharedReading) {
      next = {
        ...next,
        readings: reject(next.readings, (reading) => reading._id === sharedReading._id),
      };
    }
    if (previous) {
      const meal = mealOf(base, previous);
      next = {
        meals: meal && !some(next.meals, (item) => item._id === meal._id)
          ? [...next.meals, meal]
          : next.meals,
        readings: [...next.readings, previous],
      };
    }
  }
  for (const change of pending) {
    if (some(next.readings, (reading) => reading._id === change.reading._id)) continue;
    const onBase = findReading(base, change.reading._id);
    if (onBase) {
      next = { ...next, readings: [...next.readings, onBase] };
    }
  }
  return next;
}

function changeFor(log: LocalLog, reading: StoredReading): OutboundChange {
  const meal = mealOf(log, reading) ?? emptyMeal(reading);
  return {
    reading,
    meal: {
      ...meal,
      photos: take(filter(meal.photos, shareablePhoto), MAX_MEAL_PHOTOS),
    },
  };
}

function shareablePhoto(photo: MealPhoto): boolean {
  if (photo.storageId) return true;
  if (!photo.url) return false;
  return !photo.url.startsWith("blob:") && !photo.url.startsWith("data:");
}

function enqueue(pending: OutboundChange[], change: OutboundChange): OutboundChange[] {
  const without = reject(pending, (item) => item.reading._id === change.reading._id);
  return [...without, change];
}

function reflects(shared: LocalLog, change: OutboundChange): boolean {
  const found = findReading(shared, change.reading._id);
  if (!found) return false;
  if (Boolean(change.reading.archivedAt) !== Boolean(found.archivedAt)) return false;
  if (change.reading.archivedAt) return true;
  if (
    found.valueMgDl !== change.reading.valueMgDl ||
    found.context !== change.reading.context ||
    found.takenAt !== change.reading.takenAt
  ) {
    return false;
  }
  const meal = find(shared.meals, (item) => item._id === change.meal._id);
  if (!meal) return false;
  return (meal.note ?? "") === (change.meal.note ?? "") && photoKeys(meal.photos) === photoKeys(change.meal.photos);
}

function adoptReading(
  log: LocalLog,
  reading: StoredReading,
  meal: StoredMeal | undefined,
): LocalLog {
  const meals = meal
    ? some(log.meals, (item) => item._id === meal._id)
      ? map(log.meals, (item) => (item._id === meal._id ? { ...item, ...meal, archivedAt: undefined } : item))
      : [...log.meals, meal]
    : log.meals;
  const readings = some(log.readings, (item) => item._id === reading._id)
    ? map(log.readings, (item) => (item._id === reading._id ? reading : item))
    : [...log.readings, reading];
  return { meals, readings };
}

function revive(log: LocalLog, readingId: string): LocalLog {
  const reading = findReading(log, readingId);
  if (!reading) return log;
  return {
    meals: map(log.meals, (meal) =>
      meal._id === reading.mealId ? { ...meal, archivedAt: undefined } : meal,
    ),
    readings: map(log.readings, (item) =>
      item._id === readingId ? { ...item, archivedAt: undefined } : item,
    ),
  };
}

function archiveInPlace(
  log: LocalLog,
  readingId: string,
  now: number,
  rememberedNote: string | undefined,
): LocalLog {
  return {
    ...log,
    readings: map(log.readings, (reading) =>
      reading._id === readingId
        ? { ...reading, archivedAt: now, rememberedNote }
        : reading,
    ),
  };
}

function upsertArchived(log: LocalLog, reading: StoredReading): LocalLog {
  const readings = some(log.readings, (item) => item._id === reading._id)
    ? map(log.readings, (item) => (item._id === reading._id ? reading : item))
    : [...log.readings, reading];
  return { ...log, readings };
}

function replaceValue(
  log: LocalLog,
  readingId: string,
  sharedReading: StoredReading,
  sharedMeal: StoredMeal,
): LocalLog {
  return {
    meals: map(log.meals, (meal) =>
      meal._id === sharedReading.mealId || some(log.readings, (reading) => reading._id === readingId && reading.mealId === meal._id)
        ? { ...meal, note: sharedMeal.note, photos: reconcilePhotos(meal.photos, meal.photos, sharedMeal.photos) }
        : meal,
    ),
    readings: map(log.readings, (reading) =>
      reading._id === readingId
        ? {
            ...reading,
            valueMgDl: sharedReading.valueMgDl,
            context: sharedReading.context,
            postMealOffset: sharedReading.postMealOffset,
            takenAt: sharedReading.takenAt,
            archivedAt: undefined,
          }
        : reading,
    ),
  };
}

function rememberMealNote(
  log: LocalLog,
  mealId: string,
  remembered: string | undefined,
): LocalLog {
  if (!remembered) return log;
  return {
    ...log,
    meals: map(log.meals, (meal) =>
      meal._id === mealId ? { ...meal, rememberedNote: remembered } : meal,
    ),
  };
}

function holdExtraPhotos(
  log: LocalLog,
  readingId: string,
  photos: MealPhoto[] | undefined,
): LocalLog {
  if (!photos || photos.length <= 4) return log;
  const reading = findReading(log, readingId);
  if (!reading) return log;
  return {
    ...log,
    meals: map(log.meals, (meal) =>
      meal._id === reading.mealId ? { ...meal, photos } : meal,
    ),
  };
}

function stampAuthor(log: LocalLog, readingId: string, recordedBy: string): LocalLog {
  return {
    ...log,
    readings: map(log.readings, (reading) =>
      reading._id === readingId ? { ...reading, recordedBy } : reading,
    ),
  };
}

function findReading(log: LocalLog, id: string): StoredReading | undefined {
  return find(log.readings, (reading) => reading._id === id);
}

function mealOf(log: LocalLog, reading: StoredReading): StoredMeal | undefined {
  return find(log.meals, (meal) => meal._id === reading.mealId);
}

function noteOf(log: LocalLog, reading: StoredReading): string {
  return mealOf(log, reading)?.note ?? "";
}

function photosOf(log: LocalLog, reading: StoredReading): MealPhoto[] {
  return mealOf(log, reading)?.photos ?? [];
}

function photoKey(photo: MealPhoto): string {
  return photo.storageId ?? photo.url ?? "";
}

function photoKeys(photos: MealPhoto[]): string {
  return sortBy(map(photos, photoKey)).join("|");
}

function emptyMeal(reading: StoredReading): StoredMeal {
  return {
    _id: reading.mealId,
    slot: mealSlotForContext(reading.context) as MealSlot,
    anchorAt: reading.takenAt,
    photos: [],
    createdAt: reading.createdAt,
  };
}

function uniqSorted(keys: string[]): string[] {
  return sortBy(uniqBy(keys, (key) => key));
}

export function outboundChanges(changes: OutboundChange[]) {
  return map(changes, (change) => ({
    clientReadingId: change.reading._id,
    clientMealId: change.meal._id,
    slot: change.meal.slot,
    anchorAt: change.meal.anchorAt,
    note: change.meal.note,
    mealRememberedNote: change.meal.rememberedNote,
    photos: change.meal.photos,
    valueMgDl: change.reading.valueMgDl,
    context: change.reading.context,
    postMealOffset: change.reading.postMealOffset,
    takenAt: change.reading.takenAt,
    createdAt: change.reading.createdAt,
    archivedAt: change.reading.archivedAt,
    recordedBy: change.reading.recordedBy,
    rememberedNote: change.reading.rememberedNote,
  }));
}

export function logFromServer(input: {
  meals: Array<{
    _id: string;
    clientId?: string;
    slot: StoredMeal["slot"];
    anchorAt: number;
    note?: string;
    rememberedNote?: string;
    photos: MealPhoto[];
    createdAt: number;
    archivedAt?: number;
  }>;
  readings: Array<{
    _id: string;
    clientId?: string;
    mealId?: string;
    userId: string;
    recordedBy?: string;
    valueMgDl: number;
    context: StoredReading["context"];
    postMealOffset?: StoredReading["postMealOffset"];
    takenAt: number;
    createdAt: number;
    archivedAt?: number;
    rememberedNote?: string;
  }>;
}): LocalLog {
  const mealIds = new Map(
    map(input.meals, (meal) => [meal._id, meal.clientId ?? meal._id]),
  );
  return {
    meals: map(input.meals, (meal) => ({
      _id: meal.clientId ?? meal._id,
      slot: meal.slot,
      anchorAt: meal.anchorAt,
      note: meal.note,
      rememberedNote: meal.rememberedNote,
      photos: meal.photos,
      createdAt: meal.createdAt,
      archivedAt: meal.archivedAt,
    })),
    readings: compact(
      map(input.readings, (reading) => {
        const mealId = reading.mealId ? mealIds.get(reading.mealId) : undefined;
        if (!mealId) return null;
        return {
          _id: reading.clientId ?? reading._id,
          userId: reading.userId,
          recordedBy: reading.recordedBy,
          mealId,
          valueMgDl: reading.valueMgDl,
          context: reading.context,
          postMealOffset: reading.postMealOffset,
          takenAt: reading.takenAt,
          createdAt: reading.createdAt,
          archivedAt: reading.archivedAt,
          rememberedNote: reading.rememberedNote,
        };
      }),
    ),
  };
}
