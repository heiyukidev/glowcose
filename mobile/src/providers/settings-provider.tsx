import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type {
  AppSettings,
  DiabetesType,
  GlucoseUnit,
  ThresholdPreset,
} from "@glowcose/core";
import {
  completeOnboarding,
  getSettingsServerSnapshot,
  getSettingsSnapshot,
  isSettingsHydrated,
  resetSettingsToPreset,
  subscribeSettingsStore,
  updateDiabetesType,
  updateThresholds,
  updateUnit,
} from "@/stores/settings-store";

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
  const ready = useSyncExternalStore(
    subscribeSettingsStore,
    isSettingsHydrated,
    () => false,
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      ready,
      completeOnboarding: (diabetesType) => {
        completeOnboarding(diabetesType);
      },
      setUnit: (unit) => updateUnit(unit),
      setDiabetesType: (diabetesType) => updateDiabetesType(diabetesType),
      setThresholds: (thresholds) => updateThresholds(thresholds),
      resetThresholds: () => resetSettingsToPreset(),
    }),
    [ready, settings],
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
