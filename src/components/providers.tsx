"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import { useMemo, type ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import {
  ConvexReadingsProvider,
  DemoReadingsProvider,
} from "@/components/readings-provider";
import { SettingsProvider } from "@/components/settings-provider";
import { isClerkConfigured, isConvexConfigured } from "@/lib/runtime";

function ThemeAndToaster({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
    >
      <SettingsProvider>
        {children}
        <Toaster position="top-center" />
      </SettingsProvider>
    </ThemeProvider>
  );
}

function ConvexTree({ children }: { children: ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const client = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [convexUrl],
  );

  if (!client) {
    return <DemoReadingsProvider>{children}</DemoReadingsProvider>;
  }

  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      <ConvexReadingsProvider>{children}</ConvexReadingsProvider>
    </ConvexProviderWithClerk>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const clerkEnabled = isClerkConfigured();
  const convexEnabled = isConvexConfigured();
  const inner = <ThemeAndToaster>{children}</ThemeAndToaster>;

  if (clerkEnabled) {
    return (
      <ClerkProvider
        localization={frFR}
        publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      >
        {convexEnabled ? (
          <ConvexTree>{inner}</ConvexTree>
        ) : (
          <DemoReadingsProvider>{inner}</DemoReadingsProvider>
        )}
      </ClerkProvider>
    );
  }

  return <DemoReadingsProvider>{inner}</DemoReadingsProvider>;
}
