import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/components/screen";
import { AppHeader } from "@/components/header";
import { Disclaimer } from "@/components/disclaimer";
import { ReadingsList } from "@/components/reading-list";
import { useReadings } from "@/providers/readings-provider";
import { colors } from "@/theme";

export default function HistoryRoute() {
  const { readings, ready, source } = useReadings();

  return (
    <Screen>
      <AppHeader demo={source === "demo"} />
      <Text style={styles.title}>Historique</Text>
      {!ready ? (
        <View style={styles.skeleton} />
      ) : (
        <ReadingsList
          readings={readings}
          emptyTitle="Aucune glycémie"
          emptyBody="Les mesures apparaîtront ici, groupées par jour."
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
