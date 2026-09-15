import { useMemo, type ReactNode } from "react";
import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

import { clerkPublishableKey, convexUrl, isConvexConfigured } from "@/runtime";
import {
  ConvexReadingsProvider,
  LocalReadingsProvider,
} from "@/providers/readings-provider";
import { SettingsProvider } from "@/providers/settings-provider";

function ConvexTree({ children }: { children: ReactNode }) {
  const url = convexUrl();
  const client = useMemo(() => (url ? new ConvexReactClient(url) : null), [url]);

  if (!client) {
    return <LocalReadingsProvider>{children}</LocalReadingsProvider>;
  }

  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      <ConvexReadingsProvider>{children}</ConvexReadingsProvider>
    </ConvexProviderWithClerk>
  );
}

export function LiveAppProviders({ children }: { children: ReactNode }) {
  const publishableKey = clerkPublishableKey();
  if (!publishableKey) {
    return (
      <LocalReadingsProvider>
        <SettingsProvider>{children}</SettingsProvider>
      </LocalReadingsProvider>
    );
  }

  const inner = <SettingsProvider>{children}</SettingsProvider>;
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      {isConvexConfigured() ? (
        <ConvexTree>{inner}</ConvexTree>
      ) : (
        <LocalReadingsProvider>{inner}</LocalReadingsProvider>
      )}
    </ClerkProvider>
  );
}
