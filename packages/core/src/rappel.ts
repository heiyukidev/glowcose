import { filter, findIndex, map, some } from "lodash";

import { isAfterContext, type Reading, type ReadingContext } from "./glucose";
import { contextForMealSide, mealSlotForContext, type DefaultDayMealSlot } from "./meal";

export const RAPPEL_DELAY_MS = 2 * 60 * 60 * 1000;

export type ActiveRappel = {
  mealId: string;
  mealLabel: string;
  afterContext: ReadingContext;
  fireAt: number;
  notificationId?: string;
};

export function canOfferRappel(meal: {
  before?: unknown;
  after?: unknown;
  slot: string;
}): boolean {
  return Boolean(meal.before && !meal.after && meal.slot !== "other");
}

export function shouldOfferRappelAfterSave(context: ReadingContext): boolean {
  return context !== "other" && !isAfterContext(context);
}

export function rappelFireAt(nowMs: number): number {
  return nowMs + RAPPEL_DELAY_MS;
}

export function formatRappelClock(
  fireAtMs: number,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(new Date(fireAtMs));
}

export function rappelNotificationBody(mealLabel: string): string {
  return `Heure de l’après · ${mealLabel}`;
}

export function afterContextForBefore(
  context: ReadingContext,
): ReadingContext | undefined {
  if (!shouldOfferRappelAfterSave(context)) return undefined;
  const slot = mealSlotForContext(context);
  if (slot === "other") return undefined;
  return contextForMealSide(slot as DefaultDayMealSlot, "after");
}

export function upsertActiveRappel(
  active: ActiveRappel[],
  next: ActiveRappel,
): ActiveRappel[] {
  const index = findIndex(active, (item) => item.mealId === next.mealId);
  if (index < 0) return [...active, next];
  return map(active, (item, itemIndex) =>
    itemIndex === index ? next : item,
  );
}

export function removeActiveRappel(
  active: ActiveRappel[],
  mealId: string,
): ActiveRappel[] {
  return filter(active, (item) => item.mealId !== mealId);
}

export function pruneFulfilledRappels(
  active: ActiveRappel[],
  readings: Array<Pick<Reading, "mealId" | "context">>,
): { kept: ActiveRappel[]; cancelled: ActiveRappel[] } {
  const kept: ActiveRappel[] = [];
  const cancelled: ActiveRappel[] = [];
  for (const rappel of active) {
    const fulfilled = some(
      readings,
      (reading) =>
        reading.mealId === rappel.mealId && isAfterContext(reading.context),
    );
    if (fulfilled) cancelled.push(rappel);
    else kept.push(rappel);
  }
  return { kept, cancelled };
}
