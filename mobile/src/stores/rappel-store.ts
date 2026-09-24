import AsyncStorage from "@react-native-async-storage/async-storage";
import { cloneDeep } from "lodash";

import {
  removeActiveRappel,
  upsertActiveRappel,
  type ActiveRappel,
  type DefaultDayMealSlot,
  type ReadingContext,
} from "@glowcose/core";

const STORAGE_KEY = "glowcose.rappels.v1";
const listeners = new Set<() => void>();

export type PendingRappelOffer = {
  slot: DefaultDayMealSlot;
  mealLabel: string;
  afterContext: ReadingContext;
};

let cached: ActiveRappel[] = [];
let hydrated = false;
let hydratePromise: Promise<void> | null = null;
let pendingOffer: PendingRappelOffer | null = null;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

async function hydrate(): Promise<void> {
  if (hydrated) return;
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      cached = raw ? (JSON.parse(raw) as ActiveRappel[]) : [];
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

async function persist(next: ActiveRappel[]) {
  cached = next;
  emit();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Local schedule UI; OS notification is source of delivery.
  }
}

export function subscribeRappels(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRappelsSnapshot(): ActiveRappel[] {
  return cached;
}

export function getRappelsReady(): boolean {
  return hydrated;
}

export function getPendingRappelOffer(): PendingRappelOffer | null {
  return pendingOffer;
}

export function setPendingRappelOffer(offer: PendingRappelOffer | null): void {
  pendingOffer = offer;
  emit();
}

export async function replaceRappels(next: ActiveRappel[]): Promise<void> {
  await hydrate();
  await persist(cloneDeep(next));
}

export async function saveRappel(rappel: ActiveRappel): Promise<void> {
  await hydrate();
  await persist(upsertActiveRappel(cached, rappel));
}

export async function deleteRappel(mealId: string): Promise<void> {
  await hydrate();
  await persist(removeActiveRappel(cached, mealId));
}
