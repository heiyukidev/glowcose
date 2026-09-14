import { filter, find, map } from "lodash";

import { DEMO_USER_ID } from "@/lib/runtime";
import type { NewReading, Reading } from "@/lib/glucose";
import { createSeedReadings } from "@/lib/seed";

const STORAGE_KEY = "glowcose.readings.v2";
const listeners = new Set<() => void>();

export const EMPTY_READINGS: Reading[] = [];

let cached: Reading[] | null = null;

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function readFromStorage(): Reading[] {
  if (!canUseStorage()) {
    return EMPTY_READINGS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = createSeedReadings();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Reading[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const seeded = createSeedReadings();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return parsed;
  } catch {
    return createSeedReadings();
  }
}

export function subscribeDemoStore(listener: () => void) {
  if (cached === null && canUseStorage()) {
    cached = readFromStorage();
  }
  listeners.add(listener);
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

export function saveDemoReadings(readings: Reading[]): void {
  cached = readings;
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
  }
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
