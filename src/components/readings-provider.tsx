"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { find, map, orderBy } from "lodash";

import { api } from "../../convex/_generated/api";
import {
  activeReadings,
  addDemoReading,
  archiveDemoReading,
  EMPTY_READINGS,
  getDemoServerSnapshot,
  getDemoSnapshot,
  resetDemoReadings,
  subscribeDemoStore,
  updateDemoReading,
} from "@/lib/demo-store";
import type { NewReading, Reading } from "@/lib/glucose";

type ReadingsContextValue = {
  readings: Reading[];
  ready: boolean;
  source: "demo" | "convex";
  addReading: (input: NewReading) => Promise<void>;
  updateReading: (id: string, input: NewReading) => Promise<void>;
  archiveReading: (id: string) => Promise<void>;
  getReading: (id: string) => Reading | undefined;
  resetDemo: () => void;
};

const ReadingsContext = createContext<ReadingsContextValue | null>(null);

function sortReadings(readings: Reading[]): Reading[] {
  return orderBy(activeReadings(readings), ["takenAt"], ["desc"]);
}

function useDemoReadingsState(): ReadingsContextValue {
  const snapshot = useSyncExternalStore(
    subscribeDemoStore,
    getDemoSnapshot,
    getDemoServerSnapshot,
  );
  const readings = useMemo(() => sortReadings(snapshot), [snapshot]);
  const ready = snapshot !== EMPTY_READINGS;

  const addReading = useCallback(async (input: NewReading) => {
    addDemoReading(input);
  }, []);

  const updateReading = useCallback(async (id: string, input: NewReading) => {
    updateDemoReading(id, input);
  }, []);

  const archiveReading = useCallback(async (id: string) => {
    archiveDemoReading(id);
  }, []);

  const getReading = useCallback(
    (id: string) => find(readings, (reading) => reading._id === id),
    [readings],
  );

  const resetDemo = useCallback(() => {
    resetDemoReadings();
  }, []);

  return useMemo(
    () => ({
      readings,
      ready,
      source: "demo" as const,
      addReading,
      updateReading,
      archiveReading,
      getReading,
      resetDemo,
    }),
    [
      addReading,
      archiveReading,
      getReading,
      readings,
      ready,
      resetDemo,
      updateReading,
    ],
  );
}

export function DemoReadingsProvider({ children }: { children: ReactNode }) {
  const value = useDemoReadingsState();
  return (
    <ReadingsContext.Provider value={value}>{children}</ReadingsContext.Provider>
  );
}

function mapConvexReading(doc: {
  _id: string;
  userId: string;
  carnetId?: string;
  recordedBy?: string;
  valueMgDl: number;
  context: Reading["context"];
  postMealOffset?: Reading["postMealOffset"];
  note?: string;
  photoUrl?: string;
  takenAt: number;
  createdAt: number;
  archivedAt?: number;
}): Reading {
  return {
    _id: doc._id,
    userId: doc.userId,
    carnetId: doc.carnetId,
    recordedBy: doc.recordedBy,
    valueMgDl: doc.valueMgDl,
    context: doc.context,
    postMealOffset: doc.postMealOffset,
    note: doc.note,
    photoUrl: doc.photoUrl,
    takenAt: doc.takenAt,
    createdAt: doc.createdAt,
    archivedAt: doc.archivedAt,
  };
}

export function ConvexReadingsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const demo = useDemoReadingsState();
  const convexReadings = useQuery(
    api.readings.list,
    isAuthenticated ? {} : "skip",
  );
  const addMutation = useMutation(api.readings.add);
  const updateMutation = useMutation(api.readings.update);
  const archiveMutation = useMutation(api.readings.archive);

  const addReading = useCallback(
    async (input: NewReading) => {
      if (!isAuthenticated) {
        await demo.addReading(input);
        return;
      }
      await addMutation(input);
    },
    [addMutation, demo, isAuthenticated],
  );

  const updateReading = useCallback(
    async (id: string, input: NewReading) => {
      if (!isAuthenticated) {
        await demo.updateReading(id, input);
        return;
      }
      await updateMutation({
        id: id as never,
        ...input,
      });
    },
    [demo, isAuthenticated, updateMutation],
  );

  const archiveReading = useCallback(
    async (id: string) => {
      if (!isAuthenticated) {
        await demo.archiveReading(id);
        return;
      }
      await archiveMutation({ id: id as never });
    },
    [archiveMutation, demo, isAuthenticated],
  );

  const value = useMemo<ReadingsContextValue>(() => {
    if (!isAuthenticated) {
      return demo;
    }
    const mapped = map(convexReadings ?? [], mapConvexReading);
    const readings = sortReadings(mapped);
    return {
      readings,
      ready: !isLoading && convexReadings !== undefined,
      source: "convex",
      addReading,
      updateReading,
      archiveReading,
      getReading: (id: string) => find(readings, (reading) => reading._id === id),
      resetDemo: demo.resetDemo,
    };
  }, [
    addReading,
    archiveReading,
    convexReadings,
    demo,
    isAuthenticated,
    isLoading,
    updateReading,
  ]);

  return (
    <ReadingsContext.Provider value={value}>{children}</ReadingsContext.Provider>
  );
}

export function useReadings(): ReadingsContextValue {
  const value = useContext(ReadingsContext);
  if (!value) {
    throw new Error("useReadings must be used within a readings provider");
  }
  return value;
}
