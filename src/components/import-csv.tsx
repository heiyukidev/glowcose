"use client";

import { find, get, map, size, trim } from "lodash";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

import { useReadings } from "@/components/readings-provider";
import { useSettings } from "@/components/settings-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  assignCorrespondence,
  CORRESPONDENCE_FIELDS,
  inspectGlucoseCsv,
  missingCorrespondenceFields,
  parseGlucoseCsv,
  planImport,
  type Correspondence,
  type CorrespondenceField,
  type CsvImportError,
} from "@/lib/csv-import";
import { formatPrimary, formatShortDate, formatTime } from "@/lib/format";
import { contextLabel, type NewReading } from "@/lib/glucose";
import { t, type TranslationKey } from "@/lib/i18n";

const ERROR_KEYS: Record<CsvImportError, TranslationKey> = {
  empty: "import.error.empty",
  not_glucose: "import.error.notGlucose",
  cgm: "import.error.cgm",
  no_rows: "import.error.noRows",
  too_large: "import.error.tooLarge",
};

const FIELD_KEYS: Record<CorrespondenceField, TranslationKey> = {
  date: "import.field.date",
  time: "import.field.time",
  value: "import.field.value",
  unit: "import.field.unit",
  context: "import.field.context",
  mealType: "import.field.mealType",
  postPrandial: "import.field.postPrandial",
  note: "import.field.note",
};

type Draft = {
  text: string;
  headers: string[];
  rows: string[][];
  guessed: Correspondence;
  correspondence: Correspondence;
};

function sampleCell(rows: string[][], columnIndex: number | undefined): string {
  if (columnIndex === undefined) {
    return "";
  }
  const row = find(
    rows,
    (candidate) => trim(get(candidate, columnIndex) ?? "") !== "",
  );
  return trim(get(row, columnIndex) ?? "");
}

function ExampleCard({
  reading,
  fromMealType,
}: {
  reading: NewReading | undefined;
  fromMealType: boolean;
}) {
  const { settings } = useSettings();
  if (!reading) {
    return (
      <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
        {t("import.exampleEmpty")}
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {t("import.example")}
      </p>
      <p className="mt-1 font-display text-2xl tracking-tight">
        {formatPrimary(reading.valueMgDl, settings.unit)}
      </p>
      <p className="mt-1 text-sm">
        {formatShortDate(reading.takenAt)} · {formatTime(reading.takenAt)}
      </p>
      <p className="text-sm text-muted-foreground">
        {contextLabel(reading.context, reading.postMealOffset)} (
        {fromMealType
          ? t("import.contextMealType")
          : t("import.contextClock")}
        )
      </p>
      {reading.note ? (
        <p className="mt-2 text-sm">{reading.note}</p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("import.exampleNoNote")}
        </p>
      )}
    </div>
  );
}

export function ImportCsv() {
  const { readings, importReadings } = useReadings();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => {
    if (!draft) {
      return null;
    }
    return parseGlucoseCsv(draft.text, draft.correspondence);
  }, [draft]);

  const planned = useMemo(() => {
    if (!parsed || !parsed.ok) {
      return null;
    }
    return planImport(readings, parsed.readings);
  }, [parsed, readings]);

  const example = useMemo(() => {
    if (!parsed || !parsed.ok) {
      return undefined;
    }
    return find(parsed.readings, (reading) => Boolean(reading.note)) ??
      get(parsed.readings, 0);
  }, [parsed]);

  const missing = draft
    ? map(missingCorrespondenceFields(draft.correspondence), (field) =>
        t(get(FIELD_KEYS, field)),
      )
    : [];

  function resetInput() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleReset() {
    setDraft(null);
    resetInput();
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = get(event.target.files, 0);
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const inspected = inspectGlucoseCsv(text);
      if (!inspected.ok) {
        toast.error(t(get(ERROR_KEYS, inspected.error)));
        handleReset();
        return;
      }
      setDraft({
        text,
        headers: inspected.headers,
        rows: inspected.rows,
        guessed: inspected.guessed,
        correspondence: inspected.guessed,
      });
    } catch {
      toast.error(t("import.error.failed"));
      handleReset();
    }
  }

  function handleAssign(
    field: CorrespondenceField,
    columnIndex: number | null,
  ) {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        correspondence: assignCorrespondence(
          current.correspondence,
          field,
          columnIndex,
        ),
      };
    });
  }

  async function handleConfirm() {
    if (!planned || size(planned.toAdd) === 0) {
      return;
    }
    setBusy(true);
    try {
      const result = await importReadings(planned.toAdd);
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

  const addCount = planned ? size(planned.toAdd) : 0;
  const canConfirm =
    size(missing) === 0 && parsed?.ok === true && addCount > 0 && !busy;

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
      {!draft ? (
        <Button
          className="h-11 rounded-2xl"
          variant="outline"
          onClick={() => inputRef.current?.click()}
        >
          {t("import.choose")}
        </Button>
      ) : (
        <div className="space-y-3">
          <ExampleCard
            reading={example}
            fromMealType={draft.correspondence.mealType !== undefined}
          />
          {map(CORRESPONDENCE_FIELDS, (field) => {
            const index = get(draft.correspondence, field.key);
            const sample = sampleCell(draft.rows, index);
            return (
              <div
                key={field.key}
                className="rounded-2xl bg-card p-3 ring-1 ring-foreground/10"
              >
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <Label>
                    {t(get(FIELD_KEYS, field.key))}
                    {field.required ? " *" : ""}
                  </Label>
                  <p className="max-w-[55%] truncate text-xs text-muted-foreground">
                    {sample === "" ? "—" : sample}
                  </p>
                </div>
                <select
                  className="h-10 w-full rounded-xl border border-border bg-background px-2 text-sm"
                  value={index === undefined ? "" : String(index)}
                  onChange={(event) =>
                    handleAssign(
                      field.key,
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                    )
                  }
                >
                  {field.required ? null : (
                    <option value="">{t("import.ignore")}</option>
                  )}
                  {map(draft.headers, (header, headerIndex) => (
                    <option key={`${header}-${headerIndex}`} value={headerIndex}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
          <p className="text-sm">{t("import.previewAdd", { count: addCount })}</p>
          {planned && planned.skippedDuplicate > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("import.previewSkip", { count: planned.skippedDuplicate })}
            </p>
          ) : null}
          {parsed?.ok && parsed.rejected > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("import.previewReject", { count: parsed.rejected })}
            </p>
          ) : null}
          {size(missing) > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("import.missing", { fields: missing.join(", ") })}
            </p>
          ) : null}
          {parsed && !parsed.ok ? (
            <p className="text-xs text-muted-foreground">
              {t(get(ERROR_KEYS, parsed.error))}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {canConfirm ? (
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
              onClick={() =>
                setDraft((current) =>
                  current
                    ? { ...current, correspondence: current.guessed }
                    : current,
                )
              }
            >
              {t("import.restoreGuess")}
            </Button>
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
