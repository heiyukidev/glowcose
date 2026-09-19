import { useMemo, type ReactNode } from "react";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

import { clerkPublishableKey, convexUrl, isConvexConfigured } from "@/runtime";
import {
  CarnetProvider,
  DemoCarnetProvider,
} from "@/providers/carnet-provider";
import {
  ConvexReadingsProvider,
  LocalReadingsProvider,
} from "@/providers/readings-provider";
import { SettingsProvider } from "@/providers/settings-provider";

function LocalTree({ children }: { children: ReactNode }) {
  return (
    <LocalReadingsProvider>
      <DemoCarnetProvider>{children}</DemoCarnetProvider>
    </LocalReadingsProvider>
  );
}

function ConvexTree({ children }: { children: ReactNode }) {
  const url = convexUrl();
  const client = useMemo(() => (url ? new ConvexReactClient(url) : null), [url]);

  if (!client) {
    return <LocalTree>{children}</LocalTree>;
  }

  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      <ConvexReadingsProvider>
        <CarnetProvider>{children}</CarnetProvider>
      </ConvexReadingsProvider>
    </ConvexProviderWithClerk>
  );
}

export function LiveAppProviders({ children }: { children: ReactNode }) {
  const publishableKey = clerkPublishableKey();
  if (!publishableKey) {
    return (
      <LocalReadingsProvider>
        <DemoCarnetProvider>
          <SettingsProvider>{children}</SettingsProvider>
        </DemoCarnetProvider>
      </LocalReadingsProvider>
    );
  }

  const inner = <SettingsProvider>{children}</SettingsProvider>;
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {isConvexConfigured() ? (
        <ConvexTree>{inner}</ConvexTree>
      ) : (
        <LocalTree>{inner}</LocalTree>
      )}
    </ClerkProvider>
  );
}
