"use client";

import {
  Component,
  createContext,
  Fragment,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { find, map, orderBy, size } from "lodash";

import { api } from "../../convex/_generated/api";
import {
  activeReadings,
  addLocalReading,
  addLocalReadings,
  archiveLocalReading,
  getLocalServerSnapshot,
  getLocalSnapshot,
  isLocalStoreHydrated,
  subscribeLocalStore,
  updateLocalReading,
} from "@/lib/readings-store";
import { JournalUnavailable } from "@/components/journal-unavailable";
import { planImport } from "@/lib/csv-import";
import type { NewReading, Reading } from "@/lib/glucose";
import {
  normalizeImageMimeType,
  storageIdFromUploadBody,
} from "@/lib/photo-upload";

type ReadingsContextValue = {
  readings: Reading[];
  ready: boolean;
  addReading: (input: NewReading) => Promise<void>;
  importReadings: (
    incoming: NewReading[],
  ) => Promise<{ inserted: number; skipped: number }>;
  updateReading: (id: string, input: NewReading) => Promise<void>;
  archiveReading: (id: string) => Promise<void>;
  getReading: (id: string) => Reading | undefined;
  uploadPhoto?: (blob: Blob) => Promise<string>;
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

  const importReadings = useCallback(async (incoming: NewReading[]) => {
    const { toAdd, skippedDuplicate } = planImport(readings, incoming);
    addLocalReadings(toAdd);
    return { inserted: size(toAdd), skipped: skippedDuplicate };
  }, [readings]);

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
      importReadings,
      updateReading,
      archiveReading,
      getReading,
    }),
    [
      addReading,
      archiveReading,
      getReading,
      importReadings,
      readings,
      ready,
      updateReading,
    ],
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
  carnetId?: string;
  recordedBy?: string;
  mealId?: string;
  valueMgDl: number;
  context: Reading["context"];
  postMealOffset?: Reading["postMealOffset"];
  note?: string;
  photos?: Reading["photos"];
  photoUrl?: string;
  photoStorageId?: string;
  takenAt: number;
  createdAt: number;
  archivedAt?: number;
}): Reading {
  return {
    _id: doc._id,
    userId: doc.userId,
    carnetId: doc.carnetId,
    recordedBy: doc.recordedBy,
    mealId: doc.mealId,
    valueMgDl: doc.valueMgDl,
    context: doc.context,
    postMealOffset: doc.postMealOffset,
    note: doc.note,
    photos: doc.photos,
    photoUrl: doc.photoUrl,
    photoStorageId: doc.photoStorageId,
    takenAt: doc.takenAt,
    createdAt: doc.createdAt,
    archivedAt: doc.archivedAt,
  };
}

function ConvexReadingsLive({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const local = useLocalReadingsState();
  const convexReadings = useQuery(
    api.readings.list,
    isAuthenticated ? {} : "skip",
  );
  const addMutation = useMutation(api.readings.add);
  const importMutation = useMutation(api.readings.importMany);
  const updateMutation = useMutation(api.readings.update);
  const archiveMutation = useMutation(api.readings.archive);
  const generatePhotoUploadUrl = useMutation(
    api.readings.generatePhotoUploadUrl,
  );

  const uploadPhoto = useCallback(
    async (blob: Blob) => {
      const postUrl = await generatePhotoUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": normalizeImageMimeType(blob.type) },
        body: blob,
      });
      if (!result.ok) {
        throw new Error("Photo upload failed");
      }
      return storageIdFromUploadBody(await result.text());
    },
    [generatePhotoUploadUrl],
  );

  const addReading = useCallback(
    async (input: NewReading) => {
      if (!isAuthenticated) {
        await local.addReading(input);
        return;
      }
      await addMutation({
        valueMgDl: input.valueMgDl,
        context: input.context,
        postMealOffset: input.postMealOffset,
        note: input.note,
        takenAt: input.takenAt,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(input.photos ? { photos: input.photos as never } : {}),
        ...(input.photoStorageId
          ? { photoStorageId: input.photoStorageId as never }
          : {}),
      });
    },
    [addMutation, isAuthenticated, local],
  );

  const importReadings = useCallback(
    async (incoming: NewReading[]) => {
      if (!isAuthenticated) {
        return await local.importReadings(incoming);
      }
      return await importMutation({
        readings: incoming,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    },
    [importMutation, isAuthenticated, local],
  );

  const updateReading = useCallback(
    async (id: string, input: NewReading) => {
      if (!isAuthenticated) {
        await local.updateReading(id, input);
        return;
      }
      await updateMutation({
        id: id as never,
        valueMgDl: input.valueMgDl,
        context: input.context,
        postMealOffset: input.postMealOffset,
        note: input.note,
        takenAt: input.takenAt,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(input.photos ? { photos: input.photos as never } : {}),
        ...(input.photoStorageId
          ? { photoStorageId: input.photoStorageId as never }
          : {}),
        ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
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
    const mapped = map(convexReadings ?? [], (doc) => mapConvexReading(doc));
    const readings = sortReadings(mapped);
    return {
      readings,
      ready: !isLoading && convexReadings !== undefined,
      addReading,
      importReadings,
      updateReading,
      archiveReading,
      uploadPhoto,
      getReading: (id: string) => find(readings, (reading) => reading._id === id),
    };
  }, [
    addReading,
    archiveReading,
    convexReadings,
    importReadings,
    isAuthenticated,
    isLoading,
    local,
    updateReading,
    uploadPhoto,
  ]);

  return (
    <ReadingsContext.Provider value={value}>{children}</ReadingsContext.Provider>
  );
}

type BoundaryState = { error: Error | null; nonce: number };

class ReadingsQueryBoundary extends Component<
  { children: ReactNode },
  BoundaryState
> {
  state: BoundaryState = { error: null, nonce: 0 };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  private retry = () => {
    this.setState((state) => ({ error: null, nonce: state.nonce + 1 }));
  };

  render() {
    if (this.state.error) {
      return <JournalUnavailable fullScreen onRetry={this.retry} />;
    }
    return <Fragment key={this.state.nonce}>{this.props.children}</Fragment>;
  }
}

export function ConvexReadingsProvider({ children }: { children: ReactNode }) {
  return (
    <ReadingsQueryBoundary>
      <ConvexReadingsLive>{children}</ConvexReadingsLive>
    </ReadingsQueryBoundary>
  );
}

export function useReadings(): ReadingsContextValue {
  const value = useContext(ReadingsContext);
  if (!value) {
    throw new Error("useReadings must be used within a readings provider");
  }
  return value;
}
