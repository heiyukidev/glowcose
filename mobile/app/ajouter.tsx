import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

import { isContext, journalDayFromKey, takenAtForJournalDay, type ReadingContext } from "@glowcose/core";
import { Screen } from "@/components/screen";
import { Disclaimer } from "@/components/disclaimer";
import { AddReadingForm } from "@/components/add-reading-form";
import { colors } from "@/theme";

function resolvePresetContext(
  raw: string | string[] | undefined,
): ReadingContext | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !isContext(value)) return undefined;
  return value;
}

function resolveDayKey(raw: string | string[] | undefined): string | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value || undefined;
}

export default function AddRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    context?: string | string[];
    day?: string | string[];
  }>();
  const presetContext = resolvePresetContext(params.context);
  const day = journalDayFromKey(resolveDayKey(params.day) ?? "");
  const presetTakenAt = day ? takenAtForJournalDay(day) : undefined;

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
          <Text style={styles.title}>Nouvelle glycémie</Text>
          <Text style={styles.sub}>Valeur, contexte, enregistrer.</Text>
        </View>
      </View>
      <AddReadingForm
        presetContext={presetContext}
        presetTakenAt={presetTakenAt}
      />
      <Disclaimer />
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
});
