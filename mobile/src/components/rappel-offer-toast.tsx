import { Pressable, StyleSheet, Text, View } from "react-native";
import { Bell } from "lucide-react-native";

import { t } from "@glowcose/core";
import { colors } from "@/theme";

export function RappelOfferToast({
  onSchedule,
  onDismiss,
}: {
  onSchedule: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={styles.toast} accessibilityRole="summary">
      <Bell color={colors.background} size={16} />
      <View style={styles.copy}>
        <Text style={styles.title}>{t("rappel.toastTitle")}</Text>
        <Text style={styles.body}>{t("rappel.toastBody")}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("rappel.scheduleShort")}
        onPress={onSchedule}
        style={styles.action}
      >
        <Text style={styles.actionLabel}>{t("rappel.scheduleShort")}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("rappel.permissionLater")}
        onPress={onDismiss}
        hitSlop={8}
      >
        <Text style={styles.dismiss}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.foreground,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.background,
    fontSize: 13,
    fontWeight: "600",
  },
  body: {
    color: colors.background,
    opacity: 0.75,
    fontSize: 12,
    marginTop: 2,
  },
  action: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionLabel: {
    color: colors.background,
    fontSize: 12,
    fontWeight: "600",
  },
  dismiss: {
    color: colors.background,
    opacity: 0.7,
    fontSize: 12,
    paddingHorizontal: 4,
  },
});
