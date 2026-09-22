"use client";

import { useEffect } from "react";

import { JournalUnavailable } from "@/components/journal-unavailable";
import { t } from "@/lib/i18n";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <JournalUnavailable
      onRetry={reset}
      homeHref="/"
      homeLabel={t("notFound.backToJournal")}
    />
  );
}
