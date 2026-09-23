import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { includes } from "lodash";

import { AnalyticsProvider } from "@/providers/analytics-provider";
import { AppProviders } from "@/providers/app-providers";
import { useSettings } from "@/providers/settings-provider";
import { colors } from "@/theme";

export {
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

function Gate() {
  const { settings, ready } = useSettings();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const inOnboarding = includes(segments as string[], "onboarding");
    const inJoin = includes(segments as string[], "rejoindre");
    if (!settings.onboarded && !inOnboarding && !inJoin) {
      router.replace("/onboarding");
    }
  }, [ready, router, segments, settings.onboarded]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="rejoindre" />
        <Stack.Screen name="ajouter" />
        <Stack.Screen name="mesure/[id]" />
      </Stack>
      {!ready ? (
        <View style={styles.boot}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </>
  );
}

export default function RootLayout() {
  return (
    <AnalyticsProvider>
      <AppProviders>
        <StatusBar style="dark" />
        <Gate />
      </AppProviders>
    </AnalyticsProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
