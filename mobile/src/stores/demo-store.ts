import { filter, find, map } from "lodash";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEMO_USER_ID,
  createSeedReadings,
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
        const seeded = createSeedReadings();
        cached = seeded;
        await persist(seeded);
      } else {
        const parsed = JSON.parse(raw) as Reading[];
        if (!Array.isArray(parsed) || parsed.length === 0) {
          const seeded = createSeedReadings();
          cached = seeded;
          await persist(seeded);
        } else {
          cached = parsed;
        }
      }
    } catch {
      cached = createSeedReadings();
    } finally {
      hydrated = true;
      emit();
    }
  })();
  return hydratePromise;
}

void hydrate();

export function subscribeDemoStore(listener: () => void) {
  listeners.add(listener);
  void hydrate();
  return () => {
    listeners.delete(listener);
  };
}

export function getDemoSnapshot(): Reading[] {
  return cached ?? EMPTY_READINGS;
}

export function getDemoServerSnapshot(): Reading[] {
  return EMPTY_READINGS;
}

export function isDemoStoreHydrated(): boolean {
  return hydrated;
}

export function saveDemoReadings(readings: Reading[]): void {
  cached = readings;
  void persist(readings);
  emit();
}

export function addDemoReading(input: NewReading): Reading {
  const readings = getDemoSnapshot();
  const reading: Reading = {
    ...input,
    _id: `local-${Date.now()}`,
    userId: DEMO_USER_ID,
    createdAt: Date.now(),
  };
  saveDemoReadings([reading, ...readings]);
  return reading;
}

export function updateDemoReading(
  id: string,
  patch: NewReading,
): Reading | null {
  const readings = getDemoSnapshot();
  const existing = find(readings, (reading) => reading._id === id);
  if (!existing || existing.archivedAt) return null;
  const updated: Reading = {
    ...existing,
    ...patch,
  };
  saveDemoReadings(
    map(readings, (reading) => (reading._id === id ? updated : reading)),
  );
  return updated;
}

export function archiveDemoReading(id: string): void {
  const readings = getDemoSnapshot();
  saveDemoReadings(
    map(readings, (reading) =>
      reading._id === id ? { ...reading, archivedAt: Date.now() } : reading,
    ),
  );
}

export function activeReadings(readings: Reading[]): Reading[] {
  return filter(readings, (reading) => !reading.archivedAt);
}

export function resetDemoReadings(): Reading[] {
  const seeded = createSeedReadings();
  saveDemoReadings(seeded);
  return seeded;
}
