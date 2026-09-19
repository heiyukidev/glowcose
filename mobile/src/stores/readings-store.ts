import { filter, find, map, size, startsWith } from "lodash";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  LOCAL_USER_ID,
  type NewReading,
  type Reading,
} from "@glowcose/core";

const STORAGE_KEY = "glowcose.readings.v2";
const listeners = new Set<() => void>();

export const EMPTY_READINGS: Reading[] = [];

let cached: Reading[] | null = null;
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function isSeededReading(reading: Reading): boolean {
  return startsWith(String(reading._id), "seed-");
}

function withoutSeedReadings(readings: Reading[]): Reading[] {
  return filter(readings, (reading) => !isSeededReading(reading));
}

async function persist(readings: Reading[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
}

async function hydrate(): Promise<void> {
  if (hydrated) return;
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        cached = [];
      } else {
        const parsed = JSON.parse(raw) as Reading[];
        if (!Array.isArray(parsed)) {
          cached = [];
        } else {
          const cleaned = withoutSeedReadings(parsed);
          cached = cleaned;
          if (size(cleaned) !== size(parsed)) {
            await persist(cleaned);
          }
        }
      }
    } catch {
      cached = [];
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
  return cached ?? EMPTY_READINGS;
}

export function getLocalServerSnapshot(): Reading[] {
  return EMPTY_READINGS;
}

export function isLocalStoreHydrated(): boolean {
  return hydrated;
}

export function saveLocalReadings(readings: Reading[]): void {
  cached = readings;
  void persist(readings);
  emit();
}

export function addLocalReading(input: NewReading): Reading {
  const readings = getLocalSnapshot();
  const reading: Reading = {
    ...input,
    _id: `local-${Date.now()}`,
    userId: LOCAL_USER_ID,
    createdAt: Date.now(),
  };
  saveLocalReadings([reading, ...readings]);
  return reading;
}

export function updateLocalReading(
  id: string,
  patch: NewReading,
): Reading | null {
  const readings = getLocalSnapshot();
  const existing = find(readings, (reading) => reading._id === id);
  if (!existing || existing.archivedAt) return null;
  const updated: Reading = {
    ...existing,
    ...patch,
  };
  saveLocalReadings(
    map(readings, (reading) => (reading._id === id ? updated : reading)),
  );
  return updated;
}

export function archiveLocalReading(id: string): void {
  const readings = getLocalSnapshot();
  saveLocalReadings(
    map(readings, (reading) =>
      reading._id === id ? { ...reading, archivedAt: Date.now() } : reading,
    ),
  );
}

export function activeReadings(readings: Reading[]): Reading[] {
  return filter(readings, (reading) => !reading.archivedAt);
}
