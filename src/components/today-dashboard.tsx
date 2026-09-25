"use client";

import { filter, map, size } from "lodash";
import type { ReactNode } from "react";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { LoadingStatus } from "@/components/loading-status";
import { Disclaimer } from "@/components/disclaimer";
import { useReadings } from "@/components/readings-provider";
import { ReadingsList } from "@/components/readings-table";
import { useSettings } from "@/components/settings-provider";
import { readingStatus } from "@/lib/glucose";
import {
  canMoveJournalForward,
  dayScoreTone,
  journalDayLabel,
  readingsOnLocalDay,
  shiftLocalDay,
  startOfLocalDay,
  type DayScoreTone,
} from "@/lib/journal-day";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<DayScoreTone, string> = {
  green:
    "bg-[var(--status-in)]/20 text-[var(--status-in-fg)] shadow-[0_0_18px_color-mix(in_oklch,var(--status-in)_70%,transparent)]",
  yellow:
    "bg-[var(--status-high)]/25 text-[var(--status-high-fg)] shadow-[0_0_18px_color-mix(in_oklch,var(--status-high)_75%,transparent)]",
  red: "bg-[var(--status-alert)]/20 text-[var(--status-alert-fg)] shadow-[0_0_18px_color-mix(in_oklch,var(--status-alert)_70%,transparent)]",
};

export function TodayDashboard() {
  const { readings, ready } = useReadings();
  const { settings } = useSettings();
  const [today] = useState(() => startOfLocalDay(new Date()));
  const [day, setDay] = useState(() => startOfLocalDay(new Date()));
  const dayReadings = readingsOnLocalDay(readings, day);
  const statuses = map(dayReadings, (reading) =>
    readingStatus(
      reading.valueMgDl,
      reading.context,
      reading.postMealOffset,
      settings.thresholds,
    ),
  );
  const inRangeCount = size(filter(statuses, (status) => status === "in_range"));
  const tone = dayScoreTone(statuses);
  const onToday = !canMoveJournalForward(day, today);
  const label = journalDayLabel(day, today);
  const scoreLabel = t("home.score", {
    inRange: inRangeCount,
    total: size(dayReadings),
  });
  const tooltip = onToday
    ? t("home.inRangeToday", {
        inRange: inRangeCount,
        total: size(dayReadings),
      })
    : t("home.inRangeOnDay", {
        inRange: inRangeCount,
        total: size(dayReadings),
        date: label,
      });

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-8">
      <AppHeader />
      <section className="relative z-20 flex h-14 items-center pb-1">
        <DayStep
          label={t("home.previousDay")}
          onClick={() => setDay((current) => shiftLocalDay(current, -1))}
        >
          <ChevronLeft className="size-5" />
        </DayStep>
        <h1 className="pointer-events-none absolute inset-x-0 text-center font-display text-3xl leading-none tracking-tight">
          {label}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          {tone ? (
            <span className="group relative">
              <button
                type="button"
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold",
                  TONE_CLASS[tone],
                )}
                aria-label={tooltip}
              >
                {scoreLabel}
              </button>
              <span
                role="tooltip"
                className="pointer-events-none absolute top-full right-0 z-30 mt-2 hidden w-52 rounded-xl bg-foreground px-3 py-2 text-center text-xs leading-snug text-background group-hover:block group-focus-within:block"
              >
                {tooltip}
              </span>
            </span>
          ) : null}
          <DayStep
            label={t("home.nextDay")}
            disabled={onToday}
            onClick={() =>
              setDay((current) =>
                canMoveJournalForward(current, today)
                  ? shiftLocalDay(current, 1)
                  : current,
              )
            }
          >
            <ChevronRight className="size-5" />
          </DayStep>
        </div>
      </section>

      {!ready ? (
        <LoadingStatus className="space-y-4">
          <div className="h-24 animate-pulse rounded-3xl bg-muted" />
          <div className="h-40 animate-pulse rounded-3xl bg-muted" />
        </LoadingStatus>
      ) : (
        <ReadingsList
          readings={dayReadings}
          byMeal
          emptyTitle={t("home.emptyTitle")}
          emptyBody={t("home.emptyBody")}
        />
      )}

      <Disclaimer className="mt-8 text-center text-xs leading-relaxed text-muted-foreground" />

      <Link
        href="/ajouter"
        aria-label={t("home.addReading")}
        className="fixed bottom-24 z-40 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_24px_color-mix(in_oklch,var(--primary)_45%,transparent)] right-[max(1rem,calc(50vw-16rem))]"
      >
        <Plus className="size-6" />
      </Link>
    </div>
  );
}

function DayStep({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-sm disabled:opacity-35"
    >
      {children}
    </button>
  );
}
