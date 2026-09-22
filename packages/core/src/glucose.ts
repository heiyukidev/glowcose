import { cloneDeep, get, includes } from "lodash";

export const DIABETES_TYPES = [
  "gestational",
  "type1",
  "type2",
  "other",
] as const;

export type DiabetesType = (typeof DIABETES_TYPES)[number];

export const CONTEXTS = [
  "before_breakfast",
  "after_breakfast",
  "before_lunch",
  "after_lunch",
  "before_dinner",
  "after_dinner",
  "other",
] as const;

export type ReadingContext = (typeof CONTEXTS)[number];
export type PostMealOffset = 1 | 2;
export type GlucoseUnit = "gL" | "mgdl" | "mmol";
export type ReadingStatus = "hypo" | "in_range" | "high" | "very_high";

export type BandThresholds = {
  hypoBelow: number;
  greenMax: number;
  orangeMax: number;
};

export type ThresholdPreset = {
  beforeMeal: BandThresholds;
  after1h: BandThresholds;
  after2h: BandThresholds;
  other: BandThresholds;
};

export type MealPhoto = {
  storageId?: string;
  url?: string;
};

export type Reading = {
  _id: string;
  userId: string;
  carnetId?: string;
  recordedBy?: string;
  mealId?: string;
  valueMgDl: number;
  context: ReadingContext;
  postMealOffset?: PostMealOffset;
  note?: string;
  photos?: MealPhoto[];
  photoUrl?: string;
  photoStorageId?: string;
  takenAt: number;
  createdAt: number;
  archivedAt?: number;
};

export type NewReading = {
  valueMgDl: number;
  context: ReadingContext;
  postMealOffset?: PostMealOffset;
  note?: string;
  photos?: MealPhoto[];
  photoUrl?: string;
  photoStorageId?: string;
  takenAt: number;
};

export function nextReadingPhoto(
  patch: Pick<NewReading, "photoUrl" | "photoStorageId" | "photos">,
): Pick<Reading, "photoUrl" | "photoStorageId" | "photos"> {
  if (patch.photos !== undefined) {
    const first = patch.photos[0];
    return {
      photos: patch.photos,
      photoUrl: first?.url,
      photoStorageId: first?.storageId,
    };
  }
  if (patch.photoStorageId !== undefined) {
    return { photoStorageId: patch.photoStorageId, photoUrl: undefined };
  }
  if (patch.photoUrl !== undefined) {
    return { photoUrl: patch.photoUrl };
  }
  return { photoUrl: undefined, photoStorageId: undefined, photos: [] };
}

export type AppSettings = {
  diabetesType: DiabetesType;
  unit: GlucoseUnit;
  onboarded: boolean;
  thresholds: ThresholdPreset;
};

export const DIABETES_TYPE_LABELS: Record<DiabetesType, string> = {
  gestational: "Gestationnel",
  type1: "Type 1",
  type2: "Type 2",
  other: "Autre",
};

export const CONTEXT_LABELS: Record<ReadingContext, string> = {
  before_breakfast: "Avant petit-déj.",
  after_breakfast: "Après petit-déj.",
  before_lunch: "Avant déjeuner",
  after_lunch: "Après déjeuner",
  before_dinner: "Avant dîner",
  after_dinner: "Après dîner",
  other: "Autre",
};

export const UNIT_LABELS: Record<GlucoseUnit, string> = {
  gL: "g/L",
  mgdl: "mg/dL",
  mmol: "mmol/L",
};

export const AFTER_CONTEXTS: ReadingContext[] = [
  "after_breakfast",
  "after_lunch",
  "after_dinner",
];

/** Gestational (France CNGOF/SFD-style) defaults. */
export const GESTATIONAL_THRESHOLDS: ThresholdPreset = {
  beforeMeal: { hypoBelow: 70, greenMax: 95, orangeMax: 120 },
  after2h: { hypoBelow: 70, greenMax: 120, orangeMax: 160 },
  after1h: { hypoBelow: 70, greenMax: 140, orangeMax: 180 },
  other: { hypoBelow: 70, greenMax: 95, orangeMax: 120 },
};

/** Adult type 1 / 2 presets — indicative only, not clinical advice. */
const ADULT_THRESHOLDS: ThresholdPreset = {
  beforeMeal: { hypoBelow: 70, greenMax: 130, orangeMax: 180 },
  after1h: { hypoBelow: 70, greenMax: 180, orangeMax: 250 },
  after2h: { hypoBelow: 70, greenMax: 180, orangeMax: 250 },
  other: { hypoBelow: 70, greenMax: 180, orangeMax: 250 },
};

export const THRESHOLD_PRESETS: Record<DiabetesType, ThresholdPreset> = {
  gestational: GESTATIONAL_THRESHOLDS,
  type1: ADULT_THRESHOLDS,
  type2: ADULT_THRESHOLDS,
  other: ADULT_THRESHOLDS,
};

export const DEFAULT_SETTINGS: AppSettings = {
  diabetesType: "gestational",
  unit: "gL",
  onboarded: false,
  thresholds: cloneDeep(GESTATIONAL_THRESHOLDS),
};

const MGDL_PER_MMOL = 18;

export function isDiabetesType(value: string): value is DiabetesType {
  return includes(DIABETES_TYPES, value);
}

export function isContext(value: string): value is ReadingContext {
  return includes(CONTEXTS, value);
}

export function isAfterContext(context: ReadingContext): boolean {
  return includes(AFTER_CONTEXTS, context);
}

export function effectiveOffset(
  context: ReadingContext,
  offset?: PostMealOffset,
): PostMealOffset | undefined {
  if (!isAfterContext(context)) return undefined;
  return offset ?? 2;
}

export function mgDlToGl(mgDl: number): number {
  return mgDl / 100;
}

export function glToMgDl(gl: number): number {
  return gl * 100;
}

export function mgDlToMmol(mgDl: number): number {
  return mgDl / MGDL_PER_MMOL;
}

export function mmolToMgDl(mmol: number): number {
  return mmol * MGDL_PER_MMOL;
}

export function thresholdsForContext(
  context: ReadingContext,
  offset: PostMealOffset | undefined,
  preset: ThresholdPreset,
): BandThresholds {
  if (context === "other") {
    return preset.other;
  }
  if (isAfterContext(context)) {
    return effectiveOffset(context, offset) === 1
      ? preset.after1h
      : preset.after2h;
  }
  return preset.beforeMeal;
}

export function readingStatus(
  valueMgDl: number,
  context: ReadingContext,
  offset: PostMealOffset | undefined,
  preset: ThresholdPreset,
): ReadingStatus {
  const band = thresholdsForContext(context, offset, preset);
  if (valueMgDl < band.hypoBelow) return "hypo";
  if (valueMgDl <= band.greenMax) return "in_range";
  if (valueMgDl <= band.orangeMax) return "high";
  return "very_high";
}

export function statusLabel(status: ReadingStatus): string {
  const labels: Record<ReadingStatus, string> = {
    hypo: "Un peu basse",
    in_range: "Dans la cible",
    high: "Au-dessus",
    very_high: "Trop élevée",
  };
  return get(labels, status);
}

export function contextLabel(
  context: ReadingContext,
  offset?: PostMealOffset,
): string {
  const base = get(CONTEXT_LABELS, context);
  if (!isAfterContext(context)) return base;
  const hours = effectiveOffset(context, offset) ?? 2;
  return `${base} · ${hours}h`;
}

/** Moment inside a meal group. The meal name lives on the group, not the row. */
export function momentLabel(
  context: ReadingContext,
  offset?: PostMealOffset,
): string {
  if (context === "other") return "Autre";
  if (!isAfterContext(context)) return "Avant";
  const hours = effectiveOffset(context, offset) ?? 2;
  return `Après · ${hours}h`;
}

export function defaultContextForTime(date: Date): ReadingContext {
  const hour = date.getHours();
  if (hour < 8) return "before_breakfast";
  if (hour < 11) return "after_breakfast";
  if (hour < 13) return "before_lunch";
  if (hour < 16) return "after_lunch";
  if (hour < 19) return "before_dinner";
  if (hour < 23) return "after_dinner";
  return "other";
}

export function parseGlucoseInput(
  raw: string,
  unit: GlucoseUnit,
): number | null {
  const normalized = raw.replace(",", ".").trim();
  if (normalized === "") return null;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (unit === "gL") {
    if (value < 0.2 || value > 6) return null;
    return glToMgDl(value);
  }
  if (unit === "mmol") {
    if (value < 1 || value > 33) return null;
    return mmolToMgDl(value);
  }
  if (value < 20 || value > 600) return null;
  return value;
}

export function convertFromMgDl(valueMgDl: number, unit: GlucoseUnit): number {
  if (unit === "gL") return mgDlToGl(valueMgDl);
  if (unit === "mmol") return mgDlToMmol(valueMgDl);
  return valueMgDl;
}
