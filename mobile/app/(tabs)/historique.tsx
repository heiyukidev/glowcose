import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { AppHeader } from "@/components/header";
import { Disclaimer } from "@/components/disclaimer";
import { ReadingsList } from "@/components/reading-list";
import { useReadings } from "@/providers/readings-provider";
import { colors } from "@/theme";
import { t } from "@glowcose/core";

export default function HistoryRoute() {
  const { readings, ready, source } = useReadings();

  return (
    <Screen>
      <AppHeader demo={source === "demo"} />
      <Text style={styles.title}>{t("history.title")}</Text>
      {!ready ? (
        <View style={styles.skeleton} />
      ) : (
        <ReadingsList
          readings={readings}
          emptyTitle={t("history.emptyTitle")}
          emptyBody={t("history.emptyBody")}
        />
      )}
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
  skeleton: {
    height: 160,
    borderRadius: 24,
    backgroundColor: colors.mutedSurface,
  },
  disclaimer: {
    marginTop: 28,
  },
});
