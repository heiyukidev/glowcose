import posthog from "posthog-js";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (token && apiHost) {
  posthog.init(token, {
    api_host: apiHost,
    defaults: "2026-08-30",
    autocapture: false,
    capture_exceptions: false,
    capture_pageview: "history_change",
    capture_pageleave: true,
    disable_session_recording: true,
    person_profiles: "identified_only",
  });
}
