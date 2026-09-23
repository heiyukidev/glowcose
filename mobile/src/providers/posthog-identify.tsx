import { useAuth } from "@clerk/expo";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";

export function PostHogIdentify() {
  const posthog = usePostHog();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && userId) {
      posthog.identify(userId);
      wasSignedIn.current = true;
      return;
    }

    if (wasSignedIn.current) {
      posthog.reset();
      wasSignedIn.current = false;
    }
  }, [isLoaded, isSignedIn, posthog, userId]);

  return null;
}
