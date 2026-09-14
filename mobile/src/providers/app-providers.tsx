import { useEffect, useState, type ComponentType, type ReactNode } from "react";

import { isClerkConfigured } from "@/runtime";
import { DemoReadingsProvider } from "@/providers/readings-provider";
import { SettingsProvider } from "@/providers/settings-provider";

function DemoTree({ children }: { children: ReactNode }) {
  return (
    <DemoReadingsProvider>
      <SettingsProvider>{children}</SettingsProvider>
    </DemoReadingsProvider>
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

  return <DemoTree>{children}</DemoTree>;
}
