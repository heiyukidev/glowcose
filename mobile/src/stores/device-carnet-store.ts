import AsyncStorage from "@react-native-async-storage/async-storage";

import { emptyDeviceCarnet, type DeviceCarnet } from "@glowcose/core";

const STORAGE_KEY = "glowcose.device-carnet.v1";
const listeners = new Set<() => void>();

let cached: DeviceCarnet = emptyDeviceCarnet();
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

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
      cached = raw ? (JSON.parse(raw) as DeviceCarnet) : emptyDeviceCarnet();
    } catch {
      cached = emptyDeviceCarnet();
    } finally {
      hydrated = true;
      emit();
    }
  })();
  return hydratePromise;
}

void hydrate();

export function subscribeDeviceCarnet(listener: () => void) {
  listeners.add(listener);
  void hydrate();
  return () => {
    listeners.delete(listener);
  };
}

export function getDeviceCarnet(): DeviceCarnet {
  return cached;
}

export function deviceCarnetOpened(): boolean {
  return cached.base !== null;
}

export async function setDeviceCarnet(next: DeviceCarnet): Promise<void> {
  cached = next;
  hydrated = true;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emit();
}

export async function clearDeviceCarnet(): Promise<void> {
  cached = emptyDeviceCarnet();
  hydrated = true;
  await AsyncStorage.removeItem(STORAGE_KEY);
  emit();
}
