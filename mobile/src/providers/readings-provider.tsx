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

import { api } from "../../../convex/_generated/api";
import type { NewReading, Reading } from "@glowcose/core";
import {
  activeReadings,
  addLocalReading,
  archiveLocalReading,
  getLocalServerSnapshot,
  getLocalSnapshot,
  isLocalStoreHydrated,
  subscribeLocalStore,
  updateLocalReading,
} from "@/stores/readings-store";

type ReadingsContextValue = {
  readings: Reading[];
  ready: boolean;
  addReading: (input: NewReading) => Promise<void>;
  updateReading: (id: string, input: NewReading) => Promise<void>;
  archiveReading: (id: string) => Promise<void>;
  getReading: (id: string) => Reading | undefined;
};

const ReadingsContext = createContext<ReadingsContextValue | null>(null);

function sortReadings(readings: Reading[]): Reading[] {
  return orderBy(activeReadings(readings), ["takenAt"], ["desc"]);
}

function useLocalReadingsState(): ReadingsContextValue {
  const snapshot = useSyncExternalStore(
    subscribeLocalStore,
    getLocalSnapshot,
    getLocalServerSnapshot,
  );
  const hydrated = useSyncExternalStore(
    subscribeLocalStore,
    isLocalStoreHydrated,
    () => false,
  );
  const readings = useMemo(() => sortReadings(snapshot), [snapshot]);
  const ready = hydrated;

  const addReading = useCallback(async (input: NewReading) => {
    addLocalReading(input);
  }, []);

  const updateReading = useCallback(async (id: string, input: NewReading) => {
    updateLocalReading(id, input);
  }, []);

  const archiveReading = useCallback(async (id: string) => {
    archiveLocalReading(id);
  }, []);

  const getReading = useCallback(
    (id: string) => find(readings, (reading) => reading._id === id),
    [readings],
  );

  return useMemo(
    () => ({
      readings,
      ready,
      addReading,
      updateReading,
      archiveReading,
      getReading,
    }),
    [addReading, archiveReading, getReading, readings, ready, updateReading],
  );
}

export function LocalReadingsProvider({ children }: { children: ReactNode }) {
  const value = useLocalReadingsState();
  return (
    <ReadingsContext.Provider value={value}>{children}</ReadingsContext.Provider>
  );
}

function mapConvexReading(doc: {
  _id: string;
  userId: string;
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
  const local = useLocalReadingsState();
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
        await local.addReading(input);
        return;
      }
      await addMutation(input);
    },
    [addMutation, isAuthenticated, local],
  );

  const updateReading = useCallback(
    async (id: string, input: NewReading) => {
      if (!isAuthenticated) {
        await local.updateReading(id, input);
        return;
      }
      await updateMutation({
        id: id as never,
        ...input,
      });
    },
    [isAuthenticated, local, updateMutation],
  );

  const archiveReading = useCallback(
    async (id: string) => {
      if (!isAuthenticated) {
        await local.archiveReading(id);
        return;
      }
      await archiveMutation({ id: id as never });
    },
    [archiveMutation, isAuthenticated, local],
  );

  const value = useMemo<ReadingsContextValue>(() => {
    if (!isAuthenticated) {
      return local;
    }
    const mapped = map(convexReadings ?? [], mapConvexReading);
    const readings = sortReadings(mapped);
    return {
      readings,
      ready: !isLoading && convexReadings !== undefined,
      addReading,
      updateReading,
      archiveReading,
      getReading: (id: string) =>
        find(readings, (reading) => reading._id === id),
    };
  }, [
    addReading,
    archiveReading,
    convexReadings,
    isAuthenticated,
    isLoading,
    local,
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
