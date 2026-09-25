import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  compact,
  filter,
  find,
  flatMap,
  groupBy,
  map,
  minBy,
  orderBy,
  sortBy,
} from "lodash";

import type { Reading } from "./glucose";
import {
  DEFAULT_DAY_MEAL_SLOTS,
  groupReadingsByMeal,
  localDateKey,
  type DefaultDayMealSlot,
  type MealCardSide,
  type MealSection,
  type MealSlot,
  pickAfterReading,
  pickBeforeReading,
} from "./meal";

export const HISTORY_DAY_PAGE_SIZE = 14;

const MEAL_ABBREV: Record<DefaultDayMealSlot, string> = {
  breakfast: "Pti",
  lunch: "Déj",
  dinner: "Dîn",
};

export function formatHistoryDay(takenAt: number): string {
  return format(takenAt, "EEE d", { locale: fr }).toLowerCase();
}

const SIDE_ABBREV: Record<MealCardSide, string> = {
  before: "Av",
  after: "Ap",
};

export function historyMealAbbrev(slot: DefaultDayMealSlot): string {
  return MEAL_ABBREV[slot];
}

export function historySideAbbrev(side: MealCardSide): string {
  return SIDE_ABBREV[side];
}

export type HistoryExtraLine = {
  id: string;
  label: string;
  reading: Reading;
};

export type HistoryDay = {
  dayKey: string;
  takenAt: number;
  slots: Record<DefaultDayMealSlot, { before?: Reading; after?: Reading }>;
  extras: HistoryExtraLine[];
};

function sectionAnchor(section: MealSection): number {
  return minBy(section.readings, "takenAt")?.takenAt ?? 0;
}

function emptySlots(): HistoryDay["slots"] {
  return { breakfast: {}, lunch: {}, dinner: {} };
}

function extraLabel(slot: MealSlot): string {
  if (slot === "other") return "Autre";
  return MEAL_ABBREV[slot];
}

function extrasFromSection(section: MealSection): HistoryExtraLine[] {
  const label = extraLabel(section.slot);
  return map(sortBy(section.readings, "takenAt"), (reading) => ({
    id: reading._id,
    label,
    reading,
  }));
}

/** One row per local day, newest first. Named meals fill Av/Ap; everything else is a line under the row. */
export function historyDays(
  readings: Reading[],
  timeZone?: string,
): HistoryDay[] {
  const sections = groupReadingsByMeal(readings);
  const grouped = groupBy(sections, (section) =>
    localDateKey(sectionAnchor(section), timeZone),
  );
  return orderBy(
    compact(
      map(grouped, (daySections, dayKey) => {
        const slots = emptySlots();
        const claimed = new Set<string>();
        for (const slot of DEFAULT_DAY_MEAL_SLOTS) {
          const section = find(daySections, (item) => item.slot === slot);
          if (!section) continue;
          claimed.add(section.id);
          const before = pickBeforeReading(section.readings);
          const after = pickAfterReading(section.readings);
          slots[slot] = {
            ...(before ? { before } : {}),
            ...(after ? { after } : {}),
          };
        }
        const anchor = minBy(daySections, sectionAnchor);
        return {
          dayKey,
          takenAt: anchor ? sectionAnchor(anchor) : 0,
          slots,
          extras: flatMap(
            filter(daySections, (section) => !claimed.has(section.id)),
            extrasFromSection,
          ),
        };
      }),
    ),
    ["dayKey"],
    ["desc"],
  );
}
