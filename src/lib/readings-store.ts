import { filter, find, map, size, startsWith } from "lodash";

import { LOCAL_USER_ID } from "@/lib/runtime";
import type { NewReading, Reading } from "@/lib/glucose";

const STORAGE_KEY = "glowcose.readings.v2";
const listeners = new Set<() => void>();

export const EMPTY_READINGS: Reading[] = [];

let cached: Reading[] | null = null;
let hydrated = false;

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

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

function readFromStorage(): Reading[] {
  if (!canUseStorage()) {
    return EMPTY_READINGS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as Reading[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    const cleaned = withoutSeedReadings(parsed);
    if (size(cleaned) !== size(parsed)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function subscribeLocalStore(listener: () => void) {
  if (!hydrated && canUseStorage()) {
    cached = readFromStorage();
    hydrated = true;
  }
  listeners.add(listener);
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
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
  }
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
