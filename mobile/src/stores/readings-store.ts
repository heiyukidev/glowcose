import { filter, find, startsWith } from "lodash";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  LOCAL_USER_ID,
  addReadingToLog,
  archiveReadingInLog,
  hydrateLocalLog,
  presentLocalLog,
  serializeLocalLog,
  updateReadingInLog,
  type LocalLog,
  type NewReading,
  type Reading,
} from "@glowcose/core";

const STORAGE_KEY = "glowcose.readings.v3";
const LEGACY_KEY = "glowcose.readings.v2";
const listeners = new Set<() => void>();

export const EMPTY_READINGS: Reading[] = [];

let cachedLog: LocalLog | null = null;
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function isSeededReading(reading: { _id: string }): boolean {
  return startsWith(String(reading._id), "seed-");
}

async function persist(log: LocalLog): Promise<void> {
  cachedLog = log;
  await AsyncStorage.setItem(STORAGE_KEY, serializeLocalLog(log));
  emit();
}

async function hydrate(): Promise<void> {
  if (hydrated) return;
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const raw =
        (await AsyncStorage.getItem(STORAGE_KEY)) ??
        (await AsyncStorage.getItem(LEGACY_KEY));
      if (!raw) {
        cachedLog = { meals: [], readings: [] };
      } else {
        const log = hydrateLocalLog(JSON.parse(raw), LOCAL_USER_ID);
        cachedLog = {
          meals: log.meals,
          readings: filter(
            log.readings,
            (reading) => !isSeededReading(reading),
          ),
        };
        await AsyncStorage.setItem(STORAGE_KEY, serializeLocalLog(cachedLog));
      }
    } catch {
      cachedLog = { meals: [], readings: [] };
    } finally {
      hydrated = true;
      emit();
    }
  })();
  return hydratePromise;
}

void hydrate();

export function subscribeLocalStore(listener: () => void) {
  listeners.add(listener);
  void hydrate();
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
  const now = Date.now();
  const readingId = `local-${now}`;
  const log = addReadingToLog(cachedLog ?? { meals: [], readings: [] }, input, {
    readingId,
    mealId: `meal-${readingId}`,
    userId: LOCAL_USER_ID,
    now,
  });
  void persist(log);
  return (
    find(presentLocalLog(log), (reading) => reading._id === readingId) ?? {
      ...input,
      _id: readingId,
      userId: LOCAL_USER_ID,
      createdAt: now,
    }
  );
}

export function updateLocalReading(
  id: string,
  patch: NewReading,
): Reading | null {
  const next = updateReadingInLog(
    cachedLog ?? { meals: [], readings: [] },
    id,
    patch,
    { mealId: `meal-${id}-${Date.now()}`, now: Date.now() },
  );
  void persist(next);
  return find(presentLocalLog(next), (reading) => reading._id === id) ?? null;
}

export function archiveLocalReading(id: string): void {
  void persist(
    archiveReadingInLog(
      cachedLog ?? { meals: [], readings: [] },
      id,
      Date.now(),
    ),
  );
}

export function activeReadings(readings: Reading[]): Reading[] {
  return filter(readings, (reading) => !reading.archivedAt);
}
