"use client";

import { useAuth } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useEffect, useRef } from "react";

export function PostHogIdentify() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
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
  }, [isLoaded, isSignedIn, userId]);

  return null;
}
