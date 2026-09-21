import { filter, find, includes, reduce, startsWith } from "lodash";

import { LOCAL_USER_ID } from "@/lib/runtime";
import type { NewReading, Reading } from "@/lib/glucose";
import {
  addReadingToLog,
  archiveReadingInLog,
  hydrateLocalLog,
  presentLocalLog,
  serializeLocalLog,
  updateReadingInLog,
  type LocalLog,
} from "@/lib/meal";

const STORAGE_KEY = "glowcose.readings.v3";
const LEGACY_KEY = "glowcose.readings.v2";
const listeners = new Set<() => void>();

export const EMPTY_READINGS: Reading[] = [];

let cachedLog: LocalLog | null = null;
let hydrated = false;

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function isSeededReading(reading: { _id: string }): boolean {
  return startsWith(String(reading._id), "seed-");
}

function readFromStorage(): LocalLog {
  if (!canUseStorage()) {
    return { meals: [], readings: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const log = hydrateLocalLog(JSON.parse(raw), LOCAL_USER_ID);
      return {
        meals: log.meals,
        readings: filter(log.readings, (reading) => !isSeededReading(reading)),
      };
    }
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (!legacy) {
      return { meals: [], readings: [] };
    }
    const parsed = JSON.parse(legacy) as unknown;
    const log = hydrateLocalLog(parsed, LOCAL_USER_ID);
    const cleaned = {
      meals: log.meals,
      readings: filter(log.readings, (reading) => !isSeededReading(reading)),
    };
    window.localStorage.setItem(STORAGE_KEY, serializeLocalLog(cleaned));
    return cleaned;
  } catch {
    return { meals: [], readings: [] };
  }
}

function persist(log: LocalLog) {
  cachedLog = log;
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, serializeLocalLog(log));
  }
  emit();
}

export function subscribeLocalStore(listener: () => void) {
  if (!hydrated && canUseStorage()) {
    cachedLog = readFromStorage();
    hydrated = true;
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLocalSnapshot(): Reading[] {
  return cachedLog ? presentLocalLog(cachedLog) : EMPTY_READINGS;
}

export function getLocalServerSnapshot(): Reading[] {
  return EMPTY_READINGS;
}

export function isLocalStoreHydrated(): boolean {
  return hydrated;
}

export function addLocalReading(input: NewReading): Reading {
  const [reading] = addLocalReadings([input]);
  if (!reading) {
    throw new Error("Enregistrement impossible");
  }
  return reading;
}

export function addLocalReadings(inputs: NewReading[]): Reading[] {
  const now = Date.now();
  const { log, addedIds } = reduce(
    inputs,
    (acc, input, index) => {
      const readingId = `local-${now}-${index}`;
      return {
        addedIds: [...acc.addedIds, readingId],
        log: addReadingToLog(acc.log, input, {
          readingId,
          mealId: `meal-${readingId}`,
          userId: LOCAL_USER_ID,
          now,
        }),
      };
    },
    {
      log: cachedLog ?? { meals: [], readings: [] },
      addedIds: [] as string[],
    },
  );
  persist(log);
  const presented = presentLocalLog(log);
  return filter(presented, (reading) => includes(addedIds, reading._id));
}

export function updateLocalReading(
  id: string,
  patch: NewReading,
): Reading | null {
  const log = cachedLog ?? { meals: [], readings: [] };
  const next = updateReadingInLog(log, id, patch, {
    mealId: `meal-${id}-${Date.now()}`,
    now: Date.now(),
  });
  persist(next);
  return find(presentLocalLog(next), (reading) => reading._id === id) ?? null;
}

export function archiveLocalReading(id: string): void {
  const log = cachedLog ?? { meals: [], readings: [] };
  persist(archiveReadingInLog(log, id, Date.now()));
}

export function activeReadings(readings: Reading[]): Reading[] {
  return filter(readings, (reading) => !reading.archivedAt);
}
