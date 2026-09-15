"use client";

import { get, map } from "lodash";

import { AppHeader } from "@/components/app-header";
import { Chip } from "@/components/chip";
import { Disclaimer } from "@/components/disclaimer";
import { useSettings } from "@/components/settings-provider";
import { UnitToggle } from "@/components/unit-toggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DIABETES_TYPE_LABELS,
  DIABETES_TYPES,
  type BandThresholds,
  type ThresholdPreset,
} from "@/lib/glucose";

const BAND_ROWS: Array<{
  key: keyof ThresholdPreset;
  label: string;
}> = [
  { key: "beforeMeal", label: "Avant repas / à jeun" },
  { key: "after1h", label: "Après repas 1h" },
  { key: "after2h", label: "Après repas 2h" },
  { key: "other", label: "Autre / hors repas" },
];

function BandFields({
  band,
  onChange,
}: {
  band: BandThresholds;
  onChange: (next: BandThresholds) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div>
        <Label className="text-[11px] text-muted-foreground">Hypo &lt;</Label>
        <Input
          inputMode="numeric"
          className="h-10"
          value={band.hypoBelow}
          onChange={(event) =>
            onChange({ ...band, hypoBelow: Number(event.target.value) || 0 })
          }
        />
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground">Vert ≤</Label>
        <Input
          inputMode="numeric"
          className="h-10"
          value={band.greenMax}
          onChange={(event) =>
            onChange({ ...band, greenMax: Number(event.target.value) || 0 })
          }
        />
      </div>
      <div>
        <Label className="text-[11px] text-muted-foreground">Orange ≤</Label>
        <Input
          inputMode="numeric"
          className="h-10"
          value={band.orangeMax}
          onChange={(event) =>
            onChange({ ...band, orangeMax: Number(event.target.value) || 0 })
          }
        />
      </div>
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
