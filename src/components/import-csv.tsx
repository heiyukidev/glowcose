"use client";

import { get, size } from "lodash";
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { useReadings } from "@/components/readings-provider";
import { Button } from "@/components/ui/button";
import {
  parseGlucoseCsv,
  planImport,
  type CsvImportError,
} from "@/lib/csv-import";
import type { NewReading } from "@/lib/glucose";
import { t, type TranslationKey } from "@/lib/i18n";

const ERROR_KEYS: Record<CsvImportError, TranslationKey> = {
  empty: "import.error.empty",
  not_glucose: "import.error.notGlucose",
  cgm: "import.error.cgm",
  no_rows: "import.error.noRows",
  too_large: "import.error.tooLarge",
};

type Preview = {
  toAdd: NewReading[];
  skippedDuplicate: number;
  rejected: number;
};

export function ImportCsv() {
  const { readings, importReadings } = useReadings();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  function resetInput() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleReset() {
    setPreview(null);
    resetInput();
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = get(event.target.files, 0);
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const parsed = parseGlucoseCsv(text);
      if (!parsed.ok) {
        toast.error(t(get(ERROR_KEYS, parsed.error)));
        handleReset();
        return;
      }
      const planned = planImport(readings, parsed.readings);
      setPreview({
        toAdd: planned.toAdd,
        skippedDuplicate: planned.skippedDuplicate,
        rejected: parsed.rejected,
      });
    } catch {
      toast.error(t("import.error.failed"));
      handleReset();
    }
  }

  async function handleConfirm() {
    if (!preview) {
      return;
    }
    setBusy(true);
    try {
      const result = await importReadings(preview.toAdd);
      toast.success(t("import.success", { count: result.inserted }));
      handleReset();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("import.error.failed"),
      );
    } finally {
      setBusy(false);
    }
  }

  const addCount = preview ? size(preview.toAdd) : 0;

  return (
    <section className="mb-8 space-y-3">
      <h2 className="text-sm font-medium">{t("import.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("import.lead")}</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="sr-only"
        onChange={(event) => void handleFile(event)}
      />
      {!preview ? (
        <Button
          className="h-11 rounded-2xl"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          {t("import.choose")}
        </Button>
      ) : (
        <div className="space-y-3 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm">{t("import.previewAdd", { count: addCount })}</p>
          {preview.skippedDuplicate > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("import.previewSkip", { count: preview.skippedDuplicate })}
            </p>
          ) : null}
          {preview.rejected > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("import.previewReject", { count: preview.rejected })}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {addCount > 0 ? (
              <Button
                className="h-11 rounded-2xl"
                disabled={busy}
                onClick={() => void handleConfirm()}
              >
                {t("import.confirm", { count: addCount })}
              </Button>
            ) : null}
            <Button
              className="h-11 rounded-2xl"
              variant="ghost"
              disabled={busy}
              onClick={handleReset}
            >
              {t("import.reset")}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
