import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { size, take } from "lodash";
import { useRouter } from "expo-router";

import { HISTORY_PAGE_SIZE, t } from "@glowcose/core";
import { Button } from "@/components/ui";
import { Screen } from "@/components/screen";
import { AppHeader } from "@/components/header";
import { Disclaimer } from "@/components/disclaimer";
import { ReadingsList } from "@/components/reading-list";
import { useReadings } from "@/providers/readings-provider";
import { colors } from "@/theme";

export default function HistoryRoute() {
  const router = useRouter();
  const { readings, ready } = useReadings();
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE);
  const visible = take(readings, visibleCount);
  const hidden = size(readings) - size(visible);

  return (
    <Screen>
      <AppHeader />
      <Text style={styles.title}>{t("history.title")}</Text>
      {!ready ? (
        <View
          accessible
          accessibilityLabel={t("loading.journal")}
          accessibilityState={{ busy: true }}
          style={styles.skeleton}
        />
      ) : (
        <>
          <ReadingsList
            readings={visible}
            emptyTitle={t("history.emptyTitle")}
            emptyBody={t("history.emptyBody")}
            emptyAction={{
              label: t("home.addReading"),
              onPress: () => router.push("/ajouter"),
            }}
          />
          {hidden > 0 ? (
            <Button
              title={t("history.loadMore")}
              variant="outline"
              onPress={() =>
                setVisibleCount((count) => count + HISTORY_PAGE_SIZE)
              }
              style={styles.more}
            />
          ) : null}
        </>
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
  more: {
    marginTop: 16,
  },
  disclaimer: {
    marginTop: 28,
  },
});
