"use client";

import { map } from "lodash";

import { Chip } from "@/components/chip";
import { UNIT_LABELS, type GlucoseUnit } from "@/lib/glucose";

const UNITS: GlucoseUnit[] = ["gL", "mgdl", "mmol"];

export function UnitToggle({
  value,
  onChange,
}: {
  value: GlucoseUnit;
  onChange: (unit: GlucoseUnit) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {map(UNITS, (unit) => (
        <Chip key={unit} selected={value === unit} onClick={() => onChange(unit)}>
          {UNIT_LABELS[unit]}
        </Chip>
      ))}
    </div>
  );
}
