import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { filter, find, size } from "lodash";
import { useRouter } from "expo-router";

import {
  canOfferRappel,
  DIABETES_TYPE_LABELS,
  readingStatus,
  t,
  todayMealCards,
} from "@glowcose/core";
import { Screen } from "@/components/screen";
import { AppHeader } from "@/components/header";
import { Disclaimer } from "@/components/disclaimer";
import { RappelOfferToast } from "@/components/rappel-offer-toast";
import { Button } from "@/components/ui";
import { ReadingsList, todayReadings } from "@/components/reading-list";
import { useRappels } from "@/hooks/use-rappels";
import { scheduleRappel } from "@/lib/rappel-notifications";
import { useCarnet } from "@/providers/carnet-provider";
import { useReadings } from "@/providers/readings-provider";
import { useSettings } from "@/providers/settings-provider";
import { colors } from "@/theme";

export default function TodayScreen() {
  const router = useRouter();
  const { readings, ready } = useReadings();
  const { settings } = useSettings();
  const { mine } = useCarnet();
  const { offer, dismissOffer } = useRappels();
  const [now] = useState(() => new Date());
  const today = todayReadings(readings, now);
  const inRangeCount = size(
    filter(
      today,
      (reading) =>
        readingStatus(
          reading.valueMgDl,
          reading.context,
          reading.postMealOffset,
          settings.thresholds,
        ) === "in_range",
    ),
  );
  const todayLabel = format(now, "EEEE d MMMM", { locale: fr });

  async function onScheduleFromToast() {
    if (!offer) return;
    const { meals } = todayMealCards(readings);
    const meal = find(meals, (item) => item.slot === offer.slot);
    if (!meal || meal.isShell || !canOfferRappel(meal)) {
      dismissOffer();
      return;
    }
    const scheduled = await scheduleRappel({
      mealId: meal.id,
      mealLabel: offer.mealLabel,
      afterContext: offer.afterContext,
    });
    if (scheduled) dismissOffer();
  }

  return (
    <Screen>
      <AppHeader />
      <Text style={styles.date}>{todayLabel}</Text>
      <Text style={styles.title}>{t("home.today")}</Text>
      <Text style={styles.sub}>
        {DIABETES_TYPE_LABELS[settings.diabetesType]} ·{" "}
        {(mine?.memberCount ?? 1) > 1
          ? t("home.sharedTracking")
          : t("home.personalTracking")}
      </Text>
      <Button
        title={t("home.addReading")}
        onPress={() => router.push("/ajouter")}
        style={styles.cta}
      />
      {offer ? (
        <RappelOfferToast
          onSchedule={() => {
            void onScheduleFromToast();
          }}
          onDismiss={dismissOffer}
        />
      ) : null}
      {!ready ? (
        <View
          accessible
          accessibilityLabel={t("loading.journal")}
          accessibilityState={{ busy: true }}
          style={styles.skeleton}
        />
      ) : (
        <>
          <Text style={styles.count}>
            {size(today) === 0
              ? t("home.noReadingToday")
              : t("home.inRangeToday", {
                  inRange: inRangeCount,
                  total: size(today),
                })}
          </Text>
          <ReadingsList
            readings={today}
            byMeal
            emptyTitle={t("home.emptyTitle")}
            emptyBody={t("home.emptyBody")}
          />
        </>
      )}
      <Disclaimer style={styles.disclaimer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  date: {
    fontSize: 13,
    color: colors.muted,
    textTransform: "capitalize",
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
    color: colors.foreground,
    fontFamily: "Georgia",
  },
  sub: {
    marginTop: 4,
    marginBottom: 16,
    fontSize: 13,
    color: colors.muted,
  },
  cta: {
    marginBottom: 16,
  },
  count: {
    marginBottom: 12,
    fontSize: 13,
    color: colors.muted,
  },
  skeleton: {
    height: 160,
    borderRadius: 24,
    backgroundColor: colors.mutedSurface,
  },
  disclaimer: {
    marginTop: 28,
  },
});
