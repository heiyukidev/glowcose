import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { Screen } from "@/components/screen";
import { Disclaimer } from "@/components/disclaimer";
import { AddReadingForm } from "@/components/add-reading-form";
import { useReadings } from "@/providers/readings-provider";
import { colors } from "@/theme";

export default function EditRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getReading, ready } = useReadings();
  const reading = id ? getReading(id) : undefined;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
          accessibilityLabel="Retour"
        >
          <ChevronLeft color={colors.foreground} size={22} />
        </Pressable>
        <View>
          <Text style={styles.title}>Modifier</Text>
          <Text style={styles.sub}>Ajustez la mesure ou archivez-la.</Text>
        </View>
      </View>
      {!ready ? (
        <View style={styles.skeleton} />
      ) : reading ? (
        <AddReadingForm initial={reading} />
      ) : (
        <Text style={styles.missing}>
          Mesure introuvable. Elle a peut-être été archivée.
        </Text>
      )}
      <Disclaimer style={styles.disclaimer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.foreground,
    fontFamily: "Georgia",
  },
  sub: {
    fontSize: 12,
    color: colors.muted,
  },
  skeleton: {
    height: 160,
    borderRadius: 24,
    backgroundColor: colors.mutedSurface,
  },
  missing: {
    fontSize: 14,
    color: colors.muted,
  },
  disclaimer: {
    marginTop: 16,
  },
});
