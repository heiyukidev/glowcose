"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { AddReadingForm } from "@/components/add-reading-form";
import { LoadingStatus } from "@/components/loading-status";
import { Disclaimer } from "@/components/disclaimer";
import { useReadings } from "@/components/readings-provider";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function EditPage() {
  const params = useParams<{ id: string }>();
  const { getReading, ready } = useReadings();
  const reading = getReading(params.id);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-8">
      <header className="flex items-center gap-2 py-3">
        <Button
          nativeButton={false}
          variant="ghost"
          size="icon"
          className="rounded-full"
          render={<Link href="/" />}
        >
          <ChevronLeft className="size-5" />
          <span className="sr-only">{t("navigation.back")}</span>
        </Button>
        <div>
          <h1 className="font-display text-xl tracking-tight">{t("edit.title")}</h1>
          <p className="text-xs text-muted-foreground">
            {t("edit.lead")}
          </p>
        </div>
      </header>
      {!ready ? (
        <LoadingStatus>
          <div className="h-40 animate-pulse rounded-3xl bg-muted" />
        </LoadingStatus>
      ) : reading ? (
        <AddReadingForm initial={reading} />
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("edit.missing")}
        </p>
      )}
      <Disclaimer className="mt-6 text-center text-xs text-muted-foreground" />
    </div>
  );
}
