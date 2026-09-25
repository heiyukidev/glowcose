import { addDays, format, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { every, filter, replace, size, some, upperFirst } from "lodash";

import type { Reading, ReadingStatus } from "./glucose";
import { t } from "./i18n";
import { localDateKey } from "./meal";

export type DayScoreTone = "green" | "yellow" | "red";

export function startOfLocalDay(day: Date): Date {
  return startOfDay(day);
}

export function shiftLocalDay(day: Date, deltaDays: number): Date {
  return addDays(startOfDay(day), deltaDays);
}

export function isSameLocalDay(left: Date, right: Date): boolean {
  return localDateKey(left.getTime()) === localDateKey(right.getTime());
}

export function canMoveJournalForward(day: Date, today: Date): boolean {
  return localDateKey(day.getTime()) < localDateKey(today.getTime());
}

export function readingsOnLocalDay(readings: Reading[], day: Date): Reading[] {
  const key = localDateKey(day.getTime());
  return filter(readings, (reading) => localDateKey(reading.takenAt) === key);
}

/**
 * Green when every reading is in range.
 * Red when any reading is too high or low.
 * Yellow when none of those, and at least one is above target.
 */
export function dayScoreTone(statuses: ReadingStatus[]): DayScoreTone | null {
  if (size(statuses) === 0) return null;
  if (some(statuses, (status) => status === "very_high" || status === "hypo")) {
    return "red";
  }
  if (some(statuses, (status) => status === "high")) return "yellow";
  if (every(statuses, (status) => status === "in_range")) return "green";
  return "red";
}

export function journalDayLabel(day: Date, today: Date): string {
  if (isSameLocalDay(day, today)) return t("home.today");
  const raw = replace(format(day, "d MMM", { locale: fr }), ".", "");
  const [dayNumber, month] = raw.split(" ");
  return `${dayNumber} ${upperFirst(month ?? "")}`;
}
