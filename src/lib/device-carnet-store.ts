import { emptyDeviceCarnet, type DeviceCarnet } from "../../packages/core/src/offline-carnet";

const STORAGE_KEY = "glowcose.device-carnet.v1";
const listeners = new Set<() => void>();

const SERVER_DEVICE: DeviceCarnet = emptyDeviceCarnet();

let cached: DeviceCarnet = SERVER_DEVICE;
let hydrated = false;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function read(): DeviceCarnet {
  if (typeof window === "undefined") return emptyDeviceCarnet();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDeviceCarnet();
    return JSON.parse(raw) as DeviceCarnet;
  } catch {
    return emptyDeviceCarnet();
  }
}

function hydrate() {
  if (hydrated) return;
  cached = read();
  hydrated = true;
}

export function subscribeDeviceCarnet(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDeviceCarnet(): DeviceCarnet {
  hydrate();
  return cached;
}

export function getDeviceCarnetServerSnapshot(): DeviceCarnet {
  return SERVER_DEVICE;
}

export function deviceCarnetOpened(): boolean {
  return getDeviceCarnet().base !== null;
}

export function setDeviceCarnet(next: DeviceCarnet): void {
  cached = next;
  hydrated = true;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  emit();
}

export function clearDeviceCarnet(): void {
  cached = emptyDeviceCarnet();
  hydrated = true;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  emit();
}
