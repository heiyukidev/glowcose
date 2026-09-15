import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { AppHeader } from "@/components/header";
import { Disclaimer } from "@/components/disclaimer";
import { Chip } from "@/components/ui";
import { GlucoseChart } from "@/components/glucose-chart";
import { useReadings } from "@/providers/readings-provider";
import { colors } from "@/theme";
import { t } from "@glowcose/core";

export default function GraphRoute() {
  const { readings, ready } = useReadings();
  const [rangeDays, setRangeDays] = useState<7 | 30>(7);

  return (
    <Screen>
      <AppHeader />
      <Text style={styles.title}>{t("graph.title")}</Text>
      <View style={styles.chips}>
        <Chip
          selected={rangeDays === 7}
          label="7 jours"
          onPress={() => setRangeDays(7)}
        />
        <Chip
          selected={rangeDays === 30}
          label="30 jours"
          onPress={() => setRangeDays(30)}
        />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("graph.trend")}</Text>
        <Text style={styles.cardBody}>
          {t("graph.reference")}
        </Text>
        {ready ? (
          <GlucoseChart readings={readings} rangeDays={rangeDays} />
        ) : (
          <View style={styles.skeleton} />
        )}
      </View>
      <Disclaimer style={styles.disclaimer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: 16,
    fontSize: 32,
    fontWeight: "600",
    color: colors.foreground,
    fontFamily: "Georgia",
  },
  chips: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.foreground,
  },
  cardBody: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 8,
  },
  skeleton: {
    height: 160,
    borderRadius: 16,
    backgroundColor: colors.mutedSurface,
  },
  disclaimer: {
    marginTop: 28,
  },
});
