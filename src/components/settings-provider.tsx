"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  completeOnboarding,
  getSettingsServerSnapshot,
  getSettingsSnapshot,
  resetSettingsToPreset,
  SERVER_SETTINGS,
  subscribeSettingsStore,
  updateDiabetesType,
  updateThresholds,
  updateUnit,
} from "@/lib/settings-store";
import type {
  AppSettings,
  DiabetesType,
  GlucoseUnit,
  ThresholdPreset,
} from "@/lib/glucose";

type SettingsContextValue = {
  settings: AppSettings;
  ready: boolean;
  completeOnboarding: (diabetesType: DiabetesType) => void;
  setUnit: (unit: GlucoseUnit) => void;
  setDiabetesType: (diabetesType: DiabetesType) => void;
  setThresholds: (thresholds: ThresholdPreset) => void;
  resetThresholds: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useSyncExternalStore(
    subscribeSettingsStore,
    getSettingsSnapshot,
    getSettingsServerSnapshot,
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      ready: settings !== SERVER_SETTINGS,
      completeOnboarding: (diabetesType) => {
        completeOnboarding(diabetesType);
      },
      setUnit: (unit) => updateUnit(unit),
      setDiabetesType: (diabetesType) => updateDiabetesType(diabetesType),
      setThresholds: (thresholds) => updateThresholds(thresholds),
      resetThresholds: () => resetSettingsToPreset(),
    }),
    [settings],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return value;
}
