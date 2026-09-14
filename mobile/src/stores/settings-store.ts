import { cloneDeep } from "lodash";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEFAULT_SETTINGS,
  THRESHOLD_PRESETS,
  type AppSettings,
  type DiabetesType,
  type GlucoseUnit,
  type ThresholdPreset,
} from "@glowcose/core";

const STORAGE_KEY = "glowcose.settings.v2";
const listeners = new Set<() => void>();

export const SERVER_SETTINGS: AppSettings = {
  ...DEFAULT_SETTINGS,
  thresholds: cloneDeep(DEFAULT_SETTINGS.thresholds),
};

let cached: AppSettings | null = null;
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function normalize(parsed: Partial<AppSettings>): AppSettings {
  const diabetesType = parsed.diabetesType ?? "gestational";
  return {
    diabetesType,
    unit: parsed.unit ?? "gL",
    onboarded: Boolean(parsed.onboarded),
    thresholds: parsed.thresholds
      ? parsed.thresholds
      : cloneDeep(THRESHOLD_PRESETS[diabetesType]),
  };
}

async function hydrate(): Promise<void> {
  if (hydrated) return;
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        cached = cloneDeep(DEFAULT_SETTINGS);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
      } else {
        cached = normalize(JSON.parse(raw) as Partial<AppSettings>);
      }
    } catch {
      cached = cloneDeep(DEFAULT_SETTINGS);
    } finally {
      hydrated = true;
      emit();
    }
  })();
  return hydratePromise;
}

void hydrate();

export function subscribeSettingsStore(listener: () => void) {
  listeners.add(listener);
  void hydrate();
  return () => {
    listeners.delete(listener);
  };
}

export function getSettingsSnapshot(): AppSettings {
  return cached ?? SERVER_SETTINGS;
}

export function getSettingsServerSnapshot(): AppSettings {
  return SERVER_SETTINGS;
}

export function isSettingsHydrated(): boolean {
  return hydrated;
}

export function saveSettings(settings: AppSettings): void {
  cached = settings;
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  emit();
}

export function completeOnboarding(diabetesType: DiabetesType): AppSettings {
  const next: AppSettings = {
    ...getSettingsSnapshot(),
    diabetesType,
    onboarded: true,
    thresholds: cloneDeep(THRESHOLD_PRESETS[diabetesType]),
  };
  saveSettings(next);
  return next;
}

export function updateUnit(unit: GlucoseUnit): void {
  saveSettings({ ...getSettingsSnapshot(), unit });
}

export function updateDiabetesType(diabetesType: DiabetesType): void {
  saveSettings({
    ...getSettingsSnapshot(),
    diabetesType,
    thresholds: cloneDeep(THRESHOLD_PRESETS[diabetesType]),
  });
}

export function updateThresholds(thresholds: ThresholdPreset): void {
  saveSettings({ ...getSettingsSnapshot(), thresholds });
}

export function resetSettingsToPreset(): void {
  const current = getSettingsSnapshot();
  saveSettings({
    ...current,
    thresholds: cloneDeep(THRESHOLD_PRESETS[current.diabetesType]),
  });
}
