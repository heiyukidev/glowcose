"use client";

import { useState } from "react";

import { AppHeader } from "@/components/app-header";
import { LoadingStatus } from "@/components/loading-status";
import { Chip } from "@/components/chip";
import { Disclaimer } from "@/components/disclaimer";
import { GlucoseChart } from "@/components/glucose-chart";
import { useReadings } from "@/components/readings-provider";
import { t } from "@/lib/i18n";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function GraphScreen() {
  const { readings, ready } = useReadings();
  const [rangeDays, setRangeDays] = useState<7 | 30>(7);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-8">
      <AppHeader />
      <h1 className="mb-4 font-display text-3xl tracking-tight">
        {t("graph.title")}
      </h1>
      <div className="mb-4 flex gap-2">
        <Chip selected={rangeDays === 7} onClick={() => setRangeDays(7)}>
          {t("graph.days7")}
        </Chip>
        <Chip selected={rangeDays === 30} onClick={() => setRangeDays(30)}>
          {t("graph.days30")}
        </Chip>
      </div>
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>{t("graph.trend")}</CardTitle>
          <CardDescription>
            {t("graph.reference")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ready ? (
            <GlucoseChart readings={readings} rangeDays={rangeDays} />
          ) : (
            <LoadingStatus>
              <div className="h-56 animate-pulse rounded-2xl bg-muted" />
            </LoadingStatus>
          )}
        </CardContent>
      </Card>
      <Disclaimer className="mt-8 text-center text-xs leading-relaxed text-muted-foreground" />
    </div>
  );
}
