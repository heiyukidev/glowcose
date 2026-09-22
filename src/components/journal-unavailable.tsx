"use client";

import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function JournalUnavailable({
  onRetry,
  fullScreen = false,
  homeHref,
  homeLabel,
}: {
  onRetry: () => void;
  fullScreen?: boolean;
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "mx-auto flex w-full max-w-md flex-col items-center justify-center gap-3 px-4 text-center",
        fullScreen ? "min-h-dvh" : "flex-1 py-16",
      )}
    >
      <Logo />
      <h1 className="font-display text-2xl tracking-tight text-balance">
        {t("error.title")}
      </h1>
      <p className="max-w-sm text-sm text-pretty text-muted-foreground">
        {t("error.body")}
      </p>
      <Button
        type="button"
        className="mt-2 h-11 rounded-2xl px-5"
        onClick={onRetry}
      >
        {t("error.retry")}
      </Button>
      {homeHref && homeLabel ? (
        <Link
          href={homeHref}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {homeLabel}
        </Link>
      ) : null}
    </div>
  );
}
