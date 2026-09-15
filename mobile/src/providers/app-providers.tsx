import { useEffect, useState, type ComponentType, type ReactNode } from "react";

import { isClerkConfigured } from "@/runtime";
import { LocalReadingsProvider } from "@/providers/readings-provider";
import { SettingsProvider } from "@/providers/settings-provider";

function LocalTree({ children }: { children: ReactNode }) {
  return (
    <LocalReadingsProvider>
      <SettingsProvider>{children}</SettingsProvider>
    </LocalReadingsProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [Live, setLive] = useState<ComponentType<{ children: ReactNode }> | null>(
    null,
  );

  useEffect(() => {
    if (!isClerkConfigured()) return;
    let cancelled = false;
    void import("./live-app-providers").then((mod) => {
      if (!cancelled) {
        setLive(() => mod.LiveAppProviders);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (Live) {
    return <Live>{children}</Live>;
  }

  return <LocalTree>{children}</LocalTree>;
}
