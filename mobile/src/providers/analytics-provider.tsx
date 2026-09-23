import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "expo-router";
import { PostHogProvider, usePostHog } from "posthog-react-native";

import { posthogHost, posthogProjectToken } from "@/runtime";

function ScreenTracker() {
  const posthog = usePostHog();
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;
    lastPath.current = pathname;
    posthog.screen(pathname);
  }, [pathname, posthog]);

  return null;
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const apiKey = posthogProjectToken();
  if (!apiKey) return children;

  return (
    <PostHogProvider
      apiKey={apiKey}
      autocapture={{ captureScreens: false, captureTouches: false }}
      options={{
        host: posthogHost(),
        enableSessionReplay: false,
      }}
    >
      <ScreenTracker />
      {children}
    </PostHogProvider>
  );
}
