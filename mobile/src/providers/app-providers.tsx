import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

import { isClerkConfigured } from "@/runtime";
import { DemoCarnetProvider } from "@/providers/carnet-provider";
import { DemoReadingsProvider } from "@/providers/readings-provider";
import { SettingsProvider } from "@/providers/settings-provider";
import { colors } from "@/theme";

function DemoTree({ children }: { children: ReactNode }) {
  return (
    <DemoReadingsProvider>
      <DemoCarnetProvider>
        <SettingsProvider>{children}</SettingsProvider>
      </DemoCarnetProvider>
    </DemoReadingsProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const clerkEnabled = isClerkConfigured();
  const [Live, setLive] = useState<ComponentType<{ children: ReactNode }> | null>(
    null,
  );

  useEffect(() => {
    if (!clerkEnabled) return;
    let cancelled = false;
    void import("./live-app-providers").then((mod) => {
      if (!cancelled) {
        setLive(() => mod.LiveAppProviders);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [clerkEnabled]);

  if (Live) {
    return <Live>{children}</Live>;
  }

  if (clerkEnabled) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <DemoTree>{children}</DemoTree>;
}
