"use client";

import { useEffect, useState, type FocusEvent } from "react";
import { get, isEqual, map } from "lodash";

import { AppHeader } from "@/components/app-header";
import { Chip } from "@/components/chip";
import { Disclaimer } from "@/components/disclaimer";
import { ImportCsv } from "@/components/import-csv";
import { useSettings } from "@/components/settings-provider";
import { ShareCarnet } from "@/components/share-carnet";
import { UnitToggle } from "@/components/unit-toggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  bandFromDraft,
  DIABETES_TYPE_LABELS,
  DIABETES_TYPES,
  type BandThresholds,
  type ThresholdPreset,
} from "@/lib/glucose";
import { t } from "@/lib/i18n";

const BAND_ROWS: Array<{
  key: keyof ThresholdPreset;
  label: string;
}> = [
  { key: "beforeMeal", label: "Avant repas / à jeun" },
  { key: "after1h", label: "Après repas 1h" },
  { key: "after2h", label: "Après repas 2h" },
  { key: "other", label: "Autre / hors repas" },
];

function draftsFromBand(band: BandThresholds) {
  return {
    hypoBelow: String(band.hypoBelow),
    greenMax: String(band.greenMax),
    orangeMax: String(band.orangeMax),
  };
}

function BandFields({
  band,
  onChange,
}: {
  band: BandThresholds;
  onChange: (next: BandThresholds) => void;
}) {
  const [draft, setDraft] = useState(() => draftsFromBand(band));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDraft(draftsFromBand(band));
    setInvalid(false);
  }, [band]);

  function commitFromGroup(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }
    const values = map(
      event.currentTarget.querySelectorAll("input"),
      (field) => field.value,
    );
    const next = bandFromDraft({
      hypoBelow: get(values, 0) ?? "",
      greenMax: get(values, 1) ?? "",
      orangeMax: get(values, 2) ?? "",
    });
    if (!next) {
      setInvalid(true);
      setDraft(draftsFromBand(band));
      return;
    }
    setInvalid(false);
    if (!isEqual(next, band)) onChange(next);
  }

  return (
    <div className="space-y-2" onBlur={commitFromGroup}>
      <div className="grid grid-cols-3 gap-2">
        <div className="min-w-0">
          <Label className="text-[11px] text-muted-foreground">Hypo &lt;</Label>
          <Input
            inputMode="numeric"
            maxLength={3}
            aria-invalid={invalid || undefined}
            className="h-10"
            value={draft.hypoBelow}
            onChange={(event) =>
              setDraft((current) => ({ ...current, hypoBelow: event.target.value }))
            }
          />
        </div>
        <div className="min-w-0">
          <Label className="text-[11px] text-muted-foreground">Vert ≤</Label>
          <Input
            inputMode="numeric"
            maxLength={3}
            aria-invalid={invalid || undefined}
            className="h-10"
            value={draft.greenMax}
            onChange={(event) =>
              setDraft((current) => ({ ...current, greenMax: event.target.value }))
            }
          />
        </div>
        <div className="min-w-0">
          <Label className="text-[11px] text-muted-foreground">Orange ≤</Label>
          <Input
            inputMode="numeric"
            maxLength={3}
            aria-invalid={invalid || undefined}
            className="h-10"
            value={draft.orangeMax}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                orangeMax: event.target.value,
              }))
            }
          />
        </div>
      </div>
      {invalid ? (
        <p role="alert" className="text-xs text-destructive">
          {t("settings.bandOrder")}
        </p>
      ) : null}
    </div>
  );
}

export function SettingsScreen() {
  const {
    settings,
    setUnit,
    setDiabetesType,
    setThresholds,
    resetThresholds,
  } = useSettings();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-8">
      <AppHeader />
      <h1 className="mb-1 font-display text-3xl tracking-tight">Réglages</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Unités d’affichage et seuils (mg/dL). Les valeurs restent stockées en
        mg/dL.
      </p>

      <section className="mb-8 space-y-3">
        <h2 className="text-sm font-medium">Unités</h2>
        <UnitToggle value={settings.unit} onChange={setUnit} />
      </section>

      <ShareCarnet />

      <ImportCsv />

      <section className="mb-8 space-y-3">
        <h2 className="text-sm font-medium">Type de diabète</h2>
        <div className="flex flex-wrap gap-2">
          {map(DIABETES_TYPES, (type) => (
            <Chip
              key={type}
              selected={settings.diabetesType === type}
              onClick={() => setDiabetesType(type)}
            >
              {get(DIABETES_TYPE_LABELS, type)}
            </Chip>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Changer le type recharge le préréglage de couleurs. Gestationnel =
          CNGOF/SFD.
        </p>
      </section>

      <section className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Seuils (mg/dL)</h2>
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={resetThresholds}
          >
            Rétablir le préréglage
          </button>
        </div>
        {map(BAND_ROWS, (row) => (
          <div key={row.key} className="rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
            <p className="mb-2 text-sm font-medium">{row.label}</p>
            <BandFields
              band={get(settings.thresholds, row.key)}
              onChange={(band) =>
                setThresholds({ ...settings.thresholds, [row.key]: band })
              }
            />
          </div>
        ))}
      </section>

      <Disclaimer />
    </div>
  );
}
