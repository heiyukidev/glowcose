"use client";

import { AppHeader } from "@/components/app-header";
import { Disclaimer } from "@/components/disclaimer";
import { useReadings } from "@/components/readings-provider";
import { ReadingsList } from "@/components/readings-table";

export function HistoryScreen() {
  const { readings, ready, source } = useReadings();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-8">
      <AppHeader demo={source === "demo"} />
      <h1 className="mb-4 font-display text-3xl tracking-tight">Historique</h1>
      {!ready ? (
        <div className="h-40 animate-pulse rounded-3xl bg-muted" />
      ) : (
        <ReadingsList
          readings={readings}
          emptyTitle="Aucune glycémie"
          emptyBody="Les mesures apparaîtront ici, groupées par jour."
        />
      )}
      <Disclaimer className="mt-8 text-center text-xs leading-relaxed text-muted-foreground" />
    </div>
  );
}
