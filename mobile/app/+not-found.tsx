import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme";
import { t } from "@glowcose/core";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: t("notFound.page") }} />
      <View style={styles.container}>
        <Text style={styles.title}>{t("notFound.page")}</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>{t("notFound.backToJournal")}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.foreground,
  },
  link: {
    marginTop: 16,
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
});
