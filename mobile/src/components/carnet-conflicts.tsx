import { Pressable, StyleSheet, Text, View } from "react-native";
import { map, size } from "lodash";

import { formatPrimary, t } from "@glowcose/core";
import { useReadings } from "@/providers/readings-provider";
import { useSettings } from "@/providers/settings-provider";
import { colors } from "@/theme";

export function CarnetConflicts() {
  const {
    clashes,
    archived,
    chooseClash,
    dismissArchive,
    restoreReading,
    applyRememberedNote,
  } = useReadings();
  const { settings } = useSettings();
  if (size(clashes) === 0 && size(archived) === 0) return null;

  return (
    <View style={styles.stack}>
      {map(clashes, (clash) => (
        <View key={clash.id} style={styles.card}>
          <Text style={styles.title}>{t("clash.yours")}</Text>
          <Text style={styles.body}>
            {formatPrimary(clash.mine.valueMgDl, settings.unit)}
            {" · "}
            {t("clash.shared", {
              value: formatPrimary(clash.shared.valueMgDl, settings.unit),
            })}
          </Text>
          <View style={styles.row}>
            <Pressable
              style={styles.primary}
              onPress={() => void chooseClash(clash.id, "keep")}
            >
              <Text style={styles.primaryLabel}>{t("clash.keep")}</Text>
            </Pressable>
            <Pressable
              style={styles.outline}
              onPress={() => void chooseClash(clash.id, "drop")}
            >
              <Text style={styles.outlineLabel}>{t("clash.drop")}</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {size(archived) > 0 ? (
        <View style={styles.card}>
          <Text style={styles.title}>{t("archive.title")}</Text>
          {map(archived, (reading) => {
            const note = reading.note?.trim();
            return (
              <View key={reading._id} style={styles.archived}>
                <Text style={styles.body}>
                  {formatPrimary(reading.valueMgDl, settings.unit)}
                  {note ? ` · ${note}` : ""}
                </Text>
                <View style={styles.row}>
                  <Pressable
                    style={styles.outline}
                    onPress={() => void dismissArchive(reading._id)}
                  >
                    <Text style={styles.outlineLabel}>{t("archive.dismiss")}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.outline}
                    onPress={() => void restoreReading(reading._id)}
                  >
                    <Text style={styles.outlineLabel}>{t("archive.restore")}</Text>
                  </Pressable>
                  {note && reading.mealId ? (
                    <Pressable
                      style={styles.outline}
                      onPress={() => void applyRememberedNote(reading.mealId!)}
                    >
                      <Text style={styles.outlineLabel}>{t("archive.applyNote")}</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12, marginBottom: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: "600", color: colors.foreground },
  body: { fontSize: 14, color: colors.muted },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  archived: { gap: 6, marginTop: 8 },
  primary: {
    backgroundColor: colors.foreground,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryLabel: { color: colors.card, fontSize: 13, fontWeight: "600" },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  outlineLabel: { color: colors.foreground, fontSize: 13, fontWeight: "600" },
});
