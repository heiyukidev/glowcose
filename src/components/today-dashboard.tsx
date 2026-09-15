"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { filter, size } from "lodash";
import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { Disclaimer } from "@/components/disclaimer";
import { useReadings } from "@/components/readings-provider";
import { ReadingsList, todayReadings } from "@/components/readings-table";
import { useSettings } from "@/components/settings-provider";
import { Button } from "@/components/ui/button";
import { DIABETES_TYPE_LABELS, readingStatus } from "@/lib/glucose";
import { t } from "@/lib/i18n";

export function TodayDashboard() {
  const { readings, ready } = useReadings();
  const { settings } = useSettings();
  const [now] = useState(() => new Date());
  const today = todayReadings(readings, now);
  const inRangeCount = size(
    filter(
      today,
      (reading) =>
        readingStatus(
          reading.valueMgDl,
          reading.context,
          reading.postMealOffset,
          settings.thresholds,
        ) === "in_range",
    ),
  );
  const todayLabel = format(now, "EEEE d MMMM", { locale: fr });

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-8">
      <AppHeader />
      <section className="pb-4">
        <p className="text-sm capitalize text-muted-foreground">{todayLabel}</p>
        <h1 className="font-display text-3xl leading-tight tracking-tight">
          {t("home.today")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {DIABETES_TYPE_LABELS[settings.diabetesType]} · {t("home.personalTracking")}
        </p>
      </section>

      <Button
        nativeButton={false}
        className="mb-5 h-14 w-full rounded-2xl text-base font-semibold"
        render={<Link href="/ajouter" />}
      >
        <Plus className="size-5" />
        {t("home.addReading")}
      </Button>

      {!ready ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-3xl bg-muted" />
          <div className="h-40 animate-pulse rounded-3xl bg-muted" />
        </div>
      ) : (
        <>
          <p className="mb-3 px-1 text-sm text-muted-foreground">
            {size(today) === 0
              ? t("home.noReadingToday")
              : t("home.inRangeToday", {
                  inRange: inRangeCount,
                  total: size(today),
                })}
          </p>
          <ReadingsList
            readings={today}
            emptyTitle={t("home.emptyTitle")}
            emptyBody={t("home.emptyBody")}
          />
        </>
      )}

      <Disclaimer className="mt-8 text-center text-xs leading-relaxed text-muted-foreground" />
    </div>
  );
}
