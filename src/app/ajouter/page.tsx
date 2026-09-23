"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";

import { AddReadingForm } from "@/components/add-reading-form";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui/button";
import { isContext } from "@/lib/glucose";
import { t } from "@/lib/i18n";

function AddPageBody() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("context") ?? "";
  const presetContext = isContext(raw) ? raw : undefined;

  return (
    <>
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
          <h1 className="font-display text-xl tracking-tight">{t("add.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("add.lead")}</p>
        </div>
      </header>
      <AddReadingForm presetContext={presetContext} />
      <Disclaimer />
    </>
  );
}

export default function AddPage() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-8">
      <Suspense fallback={null}>
        <AddPageBody />
      </Suspense>
    </div>
  );
}
