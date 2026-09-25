"use client";

import { useState } from "react";
import { size, take } from "lodash";

import { AppHeader } from "@/components/app-header";
import { Disclaimer } from "@/components/disclaimer";
import { HistoryGrid } from "@/components/history-grid";
import { LoadingStatus } from "@/components/loading-status";
import { useReadings } from "@/components/readings-provider";
import { ReadingsList } from "@/components/readings-table";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { HISTORY_DAY_PAGE_SIZE, historyDays } from "../../packages/core/src/history";

export function HistoryScreen() {
  const { readings, ready } = useReadings();
  const days = historyDays(readings);
  const [visibleCount, setVisibleCount] = useState(HISTORY_DAY_PAGE_SIZE);
  const visible = take(days, visibleCount);
  const hidden = size(days) - size(visible);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-8">
      <AppHeader />
      <h1 className="mb-4 font-display text-3xl tracking-tight">
        {t("history.title")}
      </h1>
      {!ready ? (
        <LoadingStatus>
          <div className="h-40 animate-pulse rounded-3xl bg-muted" />
        </LoadingStatus>
      ) : (
        <>
          {size(days) === 0 ? (
            <ReadingsList
              readings={[]}
              emptyTitle={t("history.emptyTitle")}
              emptyBody={t("history.emptyBody")}
              emptyAction={{ href: "/ajouter", label: t("home.addReading") }}
            />
          ) : (
            <HistoryGrid days={visible} />
          )}
          {hidden > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-11 w-full rounded-2xl"
              onClick={() =>
                setVisibleCount((count) => count + HISTORY_DAY_PAGE_SIZE)
              }
            >
              {t("history.loadMore")}
            </Button>
          ) : null}
        </>
      )}
      <Disclaimer className="mt-8 text-center text-xs leading-relaxed text-muted-foreground" />
    </div>
  );
}
