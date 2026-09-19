"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { cloneDeep, isEqual } from "lodash";

import { api } from "../../convex/_generated/api";
import type { CarnetSnapshot } from "@/lib/carnet";
import {
  clearPendingInvite,
  readPendingInvite,
} from "@/lib/pending-invite";
import {
  getSettingsSnapshot,
  saveSettings,
  setCarnetSettingsRemote,
} from "@/lib/settings-store";

type CarnetContextValue = {
  mine: CarnetSnapshot | null;
  ready: boolean;
  createInvite: () => Promise<{ code: string; expiresAt: number }>;
  joinWithCode: (code: string) => Promise<void>;
};

const CarnetContext = createContext<CarnetContextValue | null>(null);

const STUB: CarnetContextValue = {
  mine: null,
  ready: true,
  createInvite: async () => {
    throw new Error("Connectez-vous pour partager un carnet.");
  },
  joinWithCode: async () => {
    throw new Error("Connectez-vous pour rejoindre un carnet.");
  },
};

export function DemoCarnetProvider({ children }: { children: ReactNode }) {
  return (
    <CarnetContext.Provider value={STUB}>{children}</CarnetContext.Provider>
  );
}

function overlayCarnetSettings(mine: CarnetSnapshot): void {
  const current = getSettingsSnapshot();
  const nextOnboarded = current.onboarded || mine.memberCount > 1;
  const sameType = current.diabetesType === mine.diabetesType;
  const sameThresholds = isEqual(current.thresholds, mine.thresholds);
  if (sameType && sameThresholds && current.onboarded === nextOnboarded) {
    return;
  }
  saveSettings({
    ...current,
    diabetesType: mine.diabetesType,
    thresholds: cloneDeep(mine.thresholds),
    onboarded: nextOnboarded,
  });
}

export function CarnetProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const mineQuery = useQuery(api.carnets.getMine, isAuthenticated ? {} : "skip");
  const ensureMine = useMutation(api.carnets.ensureMine);
  const updateSettings = useMutation(api.carnets.updateSettings);
  const createInviteMutation = useMutation(api.carnets.createInvite);
  const joinMutation = useMutation(api.carnets.joinWithCode);
  const attemptedInvite = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setCarnetSettingsRemote(null);
      return;
    }
    const snapshot = getSettingsSnapshot();
    void ensureMine({
      diabetesType: snapshot.onboarded ? snapshot.diabetesType : undefined,
    });
    setCarnetSettingsRemote({
      updateSettings: async (patch) => {
        await updateSettings(patch);
      },
    });
    return () => {
      setCarnetSettingsRemote(null);
    };
  }, [ensureMine, isAuthenticated, updateSettings]);

  useEffect(() => {
    if (!mineQuery) return;
    overlayCarnetSettings(mineQuery);
  }, [mineQuery]);

  const joinWithCode = useCallback(
    async (code: string) => {
      await joinMutation({ code });
      clearPendingInvite();
    },
    [joinMutation],
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    const pending = readPendingInvite();
    if (!pending || attemptedInvite.current === pending) return;
    attemptedInvite.current = pending;
    void joinWithCode(pending).catch(() => {
      /* keep the code so /rejoindre can retry with a visible error */
    });
  }, [isAuthenticated, joinWithCode]);

  const createInvite = useCallback(async () => {
    return await createInviteMutation({});
  }, [createInviteMutation]);

  const value = useMemo<CarnetContextValue>(
    () => ({
      mine: mineQuery ?? null,
      ready: !isAuthenticated || mineQuery !== undefined,
      createInvite,
      joinWithCode,
    }),
    [createInvite, isAuthenticated, joinWithCode, mineQuery],
  );

  return (
    <CarnetContext.Provider value={value}>{children}</CarnetContext.Provider>
  );
}

export function useCarnet(): CarnetContextValue {
  const value = useContext(CarnetContext);
  if (!value) {
    throw new Error("useCarnet must be used within a carnet provider");
  }
  return value;
}
