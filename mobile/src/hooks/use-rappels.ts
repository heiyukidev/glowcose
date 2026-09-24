import { useEffect, useSyncExternalStore } from "react";
import { find } from "lodash";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";

import {
  canOfferRappel,
  pruneFulfilledRappels,
  todayMealCards,
  type ActiveRappel,
} from "@glowcose/core";

import { ensureAndroidRappelChannel } from "@/lib/rappel-notifications";
import { useReadings } from "@/providers/readings-provider";
import {
  getPendingRappelOffer,
  getRappelsReady,
  getRappelsSnapshot,
  replaceRappels,
  setPendingRappelOffer,
  subscribeRappels,
  type PendingRappelOffer,
} from "@/stores/rappel-store";

const LAST_RESPONSE_KEY = "glowcose.rappel.lastNotificationResponse.v1";

export function useActiveRappels() {
  const active = useSyncExternalStore(
    subscribeRappels,
    getRappelsSnapshot,
    getRappelsSnapshot,
  );
  function rappelForMeal(mealId: string): ActiveRappel | undefined {
    return find(active, (item) => item.mealId === mealId);
  }
  return { active, rappelForMeal };
}

export function useRappels() {
  const { active, rappelForMeal } = useActiveRappels();
  const ready = useSyncExternalStore(
    subscribeRappels,
    getRappelsReady,
    getRappelsReady,
  );
  const offer = useSyncExternalStore(
    subscribeRappels,
    getPendingRappelOffer,
    getPendingRappelOffer,
  );
  const { readings } = useReadings();

  useEffect(() => {
    void ensureAndroidRappelChannel();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const snapshot = getRappelsSnapshot();
    const { kept, cancelled } = pruneFulfilledRappels(snapshot, readings);
    if (cancelled.length === 0) return;
    void (async () => {
      for (const item of cancelled) {
        if (item.notificationId) {
          await Notifications.cancelScheduledNotificationAsync(
            item.notificationId,
          );
        }
      }
      await replaceRappels(kept);
    })();
  }, [readings, ready]);

  useEffect(() => {
    if (!offer) return;
    const { meals } = todayMealCards(readings);
    const meal = find(meals, (item) => item.slot === offer.slot);
    if (meal && !canOfferRappel(meal)) {
      setPendingRappelOffer(null);
    }
  }, [offer, readings]);

  return {
    active,
    ready,
    offer,
    rappelForMeal,
    dismissOffer: () => setPendingRappelOffer(null),
    setOffer: (next: PendingRappelOffer | null) => setPendingRappelOffer(next),
  };
}

export function useRappelNotificationResponse() {
  const router = useRouter();

  useEffect(() => {
    function openFromData(data: { afterContext?: string } | undefined) {
      if (data?.afterContext) {
        router.push({
          pathname: "/ajouter",
          params: { context: data.afterContext },
        });
      }
    }

    void (async () => {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (!response) return;
      const responseId = response.notification.request.identifier;
      const seen = await AsyncStorage.getItem(LAST_RESPONSE_KEY);
      if (seen === responseId) return;
      await AsyncStorage.setItem(LAST_RESPONSE_KEY, responseId);
      openFromData(
        response.notification.request.content.data as {
          afterContext?: string;
        },
      );
    })();

    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const responseId = response.notification.request.identifier;
        void AsyncStorage.setItem(LAST_RESPONSE_KEY, responseId);
        openFromData(
          response.notification.request.content.data as {
            afterContext?: string;
          },
        );
      },
    );
    return () => sub.remove();
  }, [router]);
}
