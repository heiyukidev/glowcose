import { StyleSheet, Text, View, type ViewProps } from "react-native";
import { Droplets } from "lucide-react-native";

import { t } from "@glowcose/core";
import { colors } from "@/theme";

export function Logo({ style }: ViewProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.mark}>
        <Droplets color={colors.primaryForeground} size={18} strokeWidth={2.2} />
      </View>
      <Text style={styles.wordmark}>{t("brand.name")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  wordmark: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.foreground,
    fontFamily: "Georgia",
  },
});
