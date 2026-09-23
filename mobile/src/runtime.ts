export function isClerkConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

export function isConvexConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_CONVEX_URL);
}

export function clerkPublishableKey(): string | undefined {
  return process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

export function convexUrl(): string | undefined {
  return process.env.EXPO_PUBLIC_CONVEX_URL;
}

export function posthogProjectToken(): string | undefined {
  return process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN;
}

export function posthogHost(): string {
  return process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
}
