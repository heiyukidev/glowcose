import { Alert, Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { find } from "lodash";

import {
  formatRappelClock,
  rappelFireAt,
  rappelNotificationBody,
  t,
  type ActiveRappel,
  type ReadingContext,
} from "@glowcose/core";

import {
  deleteRappel,
  getRappelsSnapshot,
  saveRappel,
} from "@/stores/rappel-store";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type ScheduleRappelInput = {
  mealId: string;
  mealLabel: string;
  afterContext: ReadingContext;
  nowMs?: number;
};

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  if (requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  Alert.alert(t("rappel.permissionTitle"), t("rappel.permissionBody"), [
    { text: t("rappel.permissionLater"), style: "cancel" },
    {
      text: t("rappel.permissionOpenSettings"),
      onPress: () => {
        void Linking.openSettings();
      },
    },
  ]);
  return false;
}

export async function scheduleRappel(
  input: ScheduleRappelInput,
): Promise<ActiveRappel | null> {
  const allowed = await ensurePermission();
  if (!allowed) return null;

  const existing = find(
    getRappelsSnapshot(),
    (item) => item.mealId === input.mealId,
  );
  if (existing?.notificationId) {
    await Notifications.cancelScheduledNotificationAsync(existing.notificationId);
  }

  const fireAt = rappelFireAt(input.nowMs ?? Date.now());
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: t("rappel.notificationTitle"),
      body: rappelNotificationBody(input.mealLabel),
      data: {
        mealId: input.mealId,
        afterContext: input.afterContext,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(fireAt),
      channelId: Platform.OS === "android" ? "rappels" : undefined,
    },
  });

  const next: ActiveRappel = {
    mealId: input.mealId,
    mealLabel: input.mealLabel,
    afterContext: input.afterContext,
    fireAt,
    notificationId,
  };
  await saveRappel(next);
  return next;
}

export async function cancelRappel(mealId: string): Promise<void> {
  const existing = find(
    getRappelsSnapshot(),
    (item) => item.mealId === mealId,
  );
  if (existing?.notificationId) {
    await Notifications.cancelScheduledNotificationAsync(existing.notificationId);
  }
  await deleteRappel(mealId);
}

export async function cancelRappels(mealIds: string[]): Promise<void> {
  for (const mealId of mealIds) {
    await cancelRappel(mealId);
  }
}

export function formatActiveRappelClock(rappel: ActiveRappel): string {
  return formatRappelClock(rappel.fireAt);
}

export async function ensureAndroidRappelChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("rappels", {
    name: "Rappels",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}
