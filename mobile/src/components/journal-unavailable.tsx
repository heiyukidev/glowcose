import { StyleSheet, Text, View } from "react-native";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";
import { t } from "@glowcose/core";
import { colors } from "@/theme";

export function JournalUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <View accessibilityRole="alert" style={styles.screen}>
      <Logo />
      <Text style={styles.title}>{t("error.title")}</Text>
      <Text style={styles.body}>{t("error.body")}</Text>
      <Button title={t("error.retry")} onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  title: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    color: colors.foreground,
    fontFamily: "Georgia",
  },
  body: {
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: colors.muted,
  },
});
