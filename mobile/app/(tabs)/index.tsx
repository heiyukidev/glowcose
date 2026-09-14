import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { filter, size } from "lodash";
import { useRouter } from "expo-router";

import { DIABETES_TYPE_LABELS, readingStatus } from "@glowcose/core";
import { Screen } from "@/components/screen";
import { AppHeader } from "@/components/header";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui";
import { ReadingsList, todayReadings } from "@/components/reading-list";
import { useReadings } from "@/providers/readings-provider";
import { useSettings } from "@/providers/settings-provider";
import { colors } from "@/theme";

export default function TodayScreen() {
  const router = useRouter();
  const { readings, ready, source } = useReadings();
  const { settings } = useSettings();
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

  return (
    <Screen>
      <AppHeader demo={source === "demo"} />
      <Text style={styles.date}>{todayLabel}</Text>
      <Text style={styles.title}>Aujourd’hui</Text>
      <Text style={styles.sub}>
        {DIABETES_TYPE_LABELS[settings.diabetesType]} · suivi personnel
      </Text>
      <Button
        title="Ajouter une glycémie"
        onPress={() => router.push("/ajouter")}
        style={styles.cta}
      />
      {!ready ? (
        <View style={styles.skeleton} />
      ) : (
        <>
          <Text style={styles.count}>
            {size(today) === 0
              ? "Pas encore de mesure aujourd’hui."
              : `${inRangeCount} / ${size(today)} dans la cible aujourd’hui.`}
          </Text>
          <ReadingsList
            readings={today}
            emptyTitle="Rien pour aujourd’hui"
            emptyBody="Ajoutez la première glycémie du jour — moins de 10 secondes."
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
