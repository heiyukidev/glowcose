import { cloneDeep } from "lodash";

import {
  DEFAULT_SETTINGS,
  isOrderedPreset,
  resolvedThresholds,
  THRESHOLD_PRESETS,
  type AppSettings,
  type DiabetesType,
  type GlucoseUnit,
  type ThresholdPreset,
} from "@/lib/glucose";

type CarnetSettingsRemote = {
  updateSettings: (patch: {
    diabetesType?: DiabetesType;
    thresholds?: ThresholdPreset;
  }) => Promise<void>;
};

let carnetSettingsRemote: CarnetSettingsRemote | null = null;

export function setCarnetSettingsRemote(
  remote: CarnetSettingsRemote | null,
): void {
  carnetSettingsRemote = remote;
}

function syncCarnetSettings(patch: {
  diabetesType?: DiabetesType;
  thresholds?: ThresholdPreset;
}): void {
  void carnetSettingsRemote?.updateSettings(patch);
}

const STORAGE_KEY = "glowcose.settings.v2";
const listeners = new Set<() => void>();

export const SERVER_SETTINGS: AppSettings = {
  ...DEFAULT_SETTINGS,
  thresholds: cloneDeep(DEFAULT_SETTINGS.thresholds),
};

let cached: AppSettings | null = null;

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function readFromStorage(): AppSettings {
  if (!canUseStorage()) {
    return SERVER_SETTINGS;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = cloneDeep(DEFAULT_SETTINGS);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      diabetesType: parsed.diabetesType ?? "gestational",
      unit: parsed.unit ?? "gL",
      onboarded: Boolean(parsed.onboarded),
      thresholds: resolvedThresholds(
        parsed.diabetesType ?? "gestational",
        parsed.thresholds,
      ),
    };
  } catch {
    return cloneDeep(DEFAULT_SETTINGS);
  }
}

export function subscribeSettingsStore(listener: () => void) {
  if (cached === null && canUseStorage()) {
    cached = readFromStorage();
  }
  listeners.add(listener);
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

export function saveSettings(settings: AppSettings): void {
  cached = settings;
  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }
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
  syncCarnetSettings({
    diabetesType,
    thresholds: next.thresholds,
  });
  return next;
}

export function updateUnit(unit: GlucoseUnit): void {
  saveSettings({ ...getSettingsSnapshot(), unit });
}

export function updateDiabetesType(diabetesType: DiabetesType): void {
  const thresholds = cloneDeep(THRESHOLD_PRESETS[diabetesType]);
  saveSettings({
    ...getSettingsSnapshot(),
    diabetesType,
    thresholds,
  });
  syncCarnetSettings({ diabetesType, thresholds });
}

export function updateThresholds(thresholds: ThresholdPreset): void {
  if (!isOrderedPreset(thresholds)) return;
  saveSettings({ ...getSettingsSnapshot(), thresholds });
  syncCarnetSettings({ thresholds });
}

export function resetSettingsToPreset(): void {
  const current = getSettingsSnapshot();
  const thresholds = cloneDeep(THRESHOLD_PRESETS[current.diabetesType]);
  saveSettings({
    ...current,
    thresholds,
  });
  syncCarnetSettings({ thresholds });
}
