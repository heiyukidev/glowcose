import {
  Component,
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import { useAuth } from "@clerk/expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { find, orderBy } from "lodash";

import { JournalUnavailable } from "@/components/journal-unavailable";
import { api } from "../../../convex/_generated/api";
import {
  catchUp,
  choose,
  dismissArchive,
  emptyDeviceCarnet,
  logFromServer,
  outboundChanges,
  record,
  signOut,
  t,
  usesUnsignedJournal,
  view,
  type ClashView,
  type NewReading,
  type Reading,
} from "@glowcose/core";
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
import {
  clearDeviceCarnet,
  deviceCarnetOpened,
  getDeviceCarnet,
  setDeviceCarnet,
  subscribeDeviceCarnet,
} from "@/stores/device-carnet-store";
import {
  uploadLocalPhoto,
  type LocalPhotoSource,
} from "@/lib/photo-upload";

type ReadingsContextValue = {
  readings: Reading[];
  archived: Reading[];
  ready: boolean;
  clashes: ClashView[];
  addReading: (input: NewReading) => Promise<void>;
  updateReading: (id: string, input: NewReading) => Promise<void>;
  archiveReading: (id: string) => Promise<void>;
  restoreReading: (id: string) => Promise<void>;
  applyRememberedNote: (mealId: string) => Promise<void>;
  dismissArchive: (id: string) => Promise<void>;
  chooseClash: (id: string, choice: "keep" | "drop") => Promise<void>;
  signOutCarnet: () => Promise<"cleared" | "offline" | "clash">;
  getReading: (id: string) => Reading | undefined;
  uploadPhoto?: (source: LocalPhotoSource) => Promise<string>;
};

const ReadingsContext = createContext<ReadingsContextValue | null>(null);

function sortReadings(readings: Reading[]): Reading[] {
  return orderBy(activeReadings(readings), ["takenAt"], ["desc"]);
}

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function newClientId(): string {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `local-${random}`;
}

function recordMeta(readingId: string, mealId: string, userId: string) {
  return {
    readingId,
    mealId,
    userId,
    now: Date.now(),
    recordedBy: userId,
    timeZone: deviceTimeZone(),
    archivedReadingId: newClientId(),
  };
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
      archived: [],
      ready,
      clashes: [],
      addReading,
      updateReading,
      archiveReading,
      restoreReading: async () => {},
      applyRememberedNote: async () => {},
      dismissArchive: async () => {},
      chooseClash: async () => {},
      signOutCarnet: async () => "cleared" as const,
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

function ConvexReadingsLive({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut: clerkSignOut, userId } = useAuth();
  const local = useLocalReadingsState();
  const device = useSyncExternalStore(subscribeDeviceCarnet, getDeviceCarnet, getDeviceCarnet);
  const snapshot = useQuery(api.readings.snapshot, isAuthenticated ? {} : "skip");
  const applyCatchUp = useMutation(api.readings.applyCatchUp);
  const generatePhotoUploadUrl = useMutation(api.readings.generatePhotoUploadUrl);
  const sharedRef = useRef<ReturnType<typeof logFromServer> | null>(null);
  const memberId = userId ?? "member";

  const flush = useCallback(async () => {
    const caught = catchUp(getDeviceCarnet(), sharedRef.current, deviceTimeZone());
    await setDeviceCarnet(caught.device);
    if (!sharedRef.current || caught.outbound.length === 0) return;
    await applyCatchUp({
      changes: outboundChanges(caught.outbound) as never,
      timeZone: deviceTimeZone(),
    });
  }, [applyCatchUp]);

  useEffect(() => {
    if (!snapshot) return;
    sharedRef.current = logFromServer(snapshot);
    void flush().catch(() => {});
  }, [flush, snapshot]);

  const uploadPhoto = useCallback(
    async (source: LocalPhotoSource) => {
      const postUrl = await generatePhotoUploadUrl();
      return await uploadLocalPhoto(postUrl, source);
    },
    [generatePhotoUploadUrl],
  );

  const write = useCallback(
    async (
      command: Parameters<typeof record>[1],
      ids?: { readingId: string; mealId: string },
    ) => {
      let current = getDeviceCarnet();
      if (!current.base && sharedRef.current) {
        current = catchUp(current, sharedRef.current, deviceTimeZone()).device;
      }
      const readingId = ids?.readingId ?? newClientId();
      const next = record(
        current,
        command,
        recordMeta(readingId, ids?.mealId ?? newClientId(), memberId),
      );
      await setDeviceCarnet(next);
      await flush().catch(() => {});
    },
    [flush, memberId],
  );

  const addReading = useCallback(
    async (input: NewReading) => {
      if (usesUnsignedJournal(getDeviceCarnet(), isAuthenticated)) {
        await local.addReading(input);
        return;
      }
      await write({ kind: "save", input });
    },
    [isAuthenticated, local, write],
  );

  const updateReading = useCallback(
    async (id: string, input: NewReading) => {
      if (usesUnsignedJournal(getDeviceCarnet(), isAuthenticated)) {
        await local.updateReading(id, input);
        return;
      }
      await write({ kind: "update", id, input }, { readingId: id, mealId: id });
    },
    [isAuthenticated, local, write],
  );

  const archiveReading = useCallback(
    async (id: string) => {
      if (usesUnsignedJournal(getDeviceCarnet(), isAuthenticated)) {
        await local.archiveReading(id);
        return;
      }
      await write({ kind: "archive", id }, { readingId: id, mealId: id });
    },
    [isAuthenticated, local, write],
  );

  const restoreReading = useCallback(
    async (id: string) => {
      if (usesUnsignedJournal(getDeviceCarnet(), isAuthenticated)) return;
      await write({ kind: "restore", id }, { readingId: id, mealId: id });
    },
    [isAuthenticated, write],
  );

  const applyRememberedNote = useCallback(
    async (mealId: string) => {
      if (usesUnsignedJournal(getDeviceCarnet(), isAuthenticated)) return;
      await write({ kind: "apply-note", mealId }, { readingId: mealId, mealId });
    },
    [isAuthenticated, write],
  );

  const hideArchive = useCallback(async (id: string) => {
    if (usesUnsignedJournal(getDeviceCarnet(), isAuthenticated)) return;
    await setDeviceCarnet(dismissArchive(getDeviceCarnet(), id));
  }, [isAuthenticated]);

  const chooseClash = useCallback(
    async (id: string, choice: "keep" | "drop") => {
      const next = choose(getDeviceCarnet(), id, choice, {
        now: Date.now(),
        archivedReadingId: newClientId(),
      });
      await setDeviceCarnet(next);
      await flush().catch(() => {});
    },
    [flush],
  );

  const signOutCarnet = useCallback(async () => {
    const result = signOut(getDeviceCarnet(), sharedRef.current, deviceTimeZone());
    if (result.status === "stay") {
      await setDeviceCarnet(result.device);
      Alert.alert(
        t("account.signOut"),
        result.reason === "clash" ? t("clash.signOut") : t("clash.offlineSignOut"),
      );
      return result.reason;
    }
    try {
      if (result.outbound.length > 0) {
        await applyCatchUp({
          changes: outboundChanges(result.outbound) as never,
          timeZone: deviceTimeZone(),
        });
      }
    } catch {
      Alert.alert(t("account.signOut"), t("clash.offlineSignOut"));
      return "offline" as const;
    }
    await clearDeviceCarnet();
    await clerkSignOut();
    return "cleared" as const;
  }, [applyCatchUp, clerkSignOut]);

  const value = useMemo<ReadingsContextValue>(() => {
    if (usesUnsignedJournal(device, isAuthenticated)) return local;
    const opened = device.base !== null;
    const sharedLog = snapshot ? logFromServer(snapshot) : null;
    const seen = view(
      opened
        ? device
        : sharedLog
          ? { ...emptyDeviceCarnet(), base: sharedLog, local: sharedLog }
          : emptyDeviceCarnet(),
    );
    const readings = sortReadings(seen.readings);
    return {
      readings,
      archived: seen.archived,
      ready: opened || (!isLoading && snapshot !== undefined),
      clashes: seen.clashes,
      addReading,
      updateReading,
      archiveReading,
      restoreReading,
      applyRememberedNote,
      dismissArchive: hideArchive,
      chooseClash,
      signOutCarnet,
      uploadPhoto,
      getReading: (id: string) => find(readings, (reading) => reading._id === id),
    };
  }, [
    addReading,
    applyRememberedNote,
    archiveReading,
    chooseClash,
    device,
    hideArchive,
    isAuthenticated,
    isLoading,
    local,
    restoreReading,
    signOutCarnet,
    snapshot,
    updateReading,
    uploadPhoto,
  ]);

  return (
    <ReadingsContext.Provider value={value}>{children}</ReadingsContext.Provider>
  );
}

function OfflineCarnetReadings({ children }: { children: ReactNode }) {
  const device = useSyncExternalStore(subscribeDeviceCarnet, getDeviceCarnet, getDeviceCarnet);
  const seen = view(device);
  const readings = sortReadings(seen.readings);
  const value = useMemo<ReadingsContextValue>(
    () => ({
      readings,
      archived: seen.archived,
      ready: true,
      clashes: seen.clashes,
      addReading: async (input) => {
        await setDeviceCarnet(
          record(
            getDeviceCarnet(),
            { kind: "save", input },
            recordMeta(newClientId(), newClientId(), "member"),
          ),
        );
      },
      updateReading: async (id, input) => {
        await setDeviceCarnet(
          record(
            getDeviceCarnet(),
            { kind: "update", id, input },
            recordMeta(id, id, "member"),
          ),
        );
      },
      archiveReading: async (id) => {
        await setDeviceCarnet(
          record(getDeviceCarnet(), { kind: "archive", id }, recordMeta(id, id, "member")),
        );
      },
      restoreReading: async (id) => {
        await setDeviceCarnet(
          record(getDeviceCarnet(), { kind: "restore", id }, recordMeta(id, id, "member")),
        );
      },
      applyRememberedNote: async (mealId) => {
        await setDeviceCarnet(
          record(
            getDeviceCarnet(),
            { kind: "apply-note", mealId },
            recordMeta(mealId, mealId, "member"),
          ),
        );
      },
      dismissArchive: async (id) => {
        await setDeviceCarnet(dismissArchive(getDeviceCarnet(), id));
      },
      chooseClash: async (id, choice) => {
        await setDeviceCarnet(
          choose(getDeviceCarnet(), id, choice, {
            now: Date.now(),
            archivedReadingId: newClientId(),
          }),
        );
      },
      signOutCarnet: async () => {
        Alert.alert(t("account.signOut"), t("clash.offlineSignOut"));
        return "offline";
      },
      getReading: (id: string) => find(readings, (reading) => reading._id === id),
    }),
    [readings, seen.archived, seen.clashes],
  );
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

  componentDidCatch(error: Error) {
    if (/not authenticated/i.test(error.message) && !deviceCarnetOpened()) {
      void clearDeviceCarnet();
    }
  }

  private retry = () => {
    this.setState((state) => ({ error: null, nonce: state.nonce + 1 }));
  };

  render() {
    if (this.state.error) {
      if (deviceCarnetOpened()) {
        return <OfflineCarnetReadings>{this.props.children}</OfflineCarnetReadings>;
      }
      return <JournalUnavailable onRetry={this.retry} />;
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

export function useReadingsOptional(): ReadingsContextValue | null {
  return useContext(ReadingsContext);
}

export function useReadings(): ReadingsContextValue {
  const value = useContext(ReadingsContext);
  if (!value) {
    throw new Error("useReadings must be used within a readings provider");
  }
  return value;
}
