import { describe, expect, test } from "vitest";

import type { Reading } from "./glucose";
import { formatHistoryDay, historyDays } from "./history";

const PARIS = "Europe/Paris";

function reading(
  overrides: Partial<Reading> & Pick<Reading, "_id" | "takenAt" | "context">,
): Reading {
  return {
    userId: "member",
    valueMgDl: 88,
    createdAt: overrides.takenAt,
    ...overrides,
  };
}

describe("formatHistoryDay", () => {
  test("abbreviates the weekday and keeps the day number", () => {
    expect(formatHistoryDay(Date.parse("2026-09-25T08:00:00+02:00"))).toBe(
      "ven. 25",
    );
  });
});

describe("historyDays", () => {
  test("fills avant and prefers the 2h après, falling back to 1h", () => {
    const days = historyDays(
      [
        reading({
          _id: "b-before",
          mealId: "b",
          context: "before_breakfast",
          takenAt: Date.parse("2026-09-25T08:00:00+02:00"),
          valueMgDl: 88,
        }),
        reading({
          _id: "b-1h",
          mealId: "b",
          context: "after_breakfast",
          postMealOffset: 1,
          takenAt: Date.parse("2026-09-25T09:00:00+02:00"),
          valueMgDl: 135,
        }),
        reading({
          _id: "b-2h",
          mealId: "b",
          context: "after_breakfast",
          postMealOffset: 2,
          takenAt: Date.parse("2026-09-25T10:00:00+02:00"),
          valueMgDl: 110,
        }),
        reading({
          _id: "l-1h",
          mealId: "l",
          context: "after_lunch",
          postMealOffset: 1,
          takenAt: Date.parse("2026-09-26T14:00:00+02:00"),
          valueMgDl: 140,
        }),
      ],
      PARIS,
    );

    expect(days.map((day) => day.dayKey)).toEqual(["2026-09-26", "2026-09-25"]);
    expect(days[1]?.slots.breakfast.before?._id).toBe("b-before");
    expect(days[1]?.slots.breakfast.after?._id).toBe("b-2h");
    expect(days[0]?.slots.lunch.before).toBeUndefined();
    expect(days[0]?.slots.lunch.after?._id).toBe("l-1h");
    expect(days[0]?.slots.dinner.before).toBeUndefined();
  });

  test("puts each Autre on its own line under the day", () => {
    const days = historyDays(
      [
        reading({
          _id: "snack",
          mealId: "o1",
          context: "other",
          takenAt: Date.parse("2026-09-25T16:00:00+02:00"),
          valueMgDl: 110,
        }),
        reading({
          _id: "late",
          mealId: "o2",
          context: "other",
          takenAt: Date.parse("2026-09-25T22:00:00+02:00"),
          valueMgDl: 99,
        }),
      ],
      PARIS,
    );

    expect(days[0]?.extras.map((line) => line.reading._id)).toEqual([
      "snack",
      "late",
    ]);
    expect(days[0]?.extras[0]?.label).toBe("Autre");
    expect(days[0]?.slots.breakfast.before).toBeUndefined();
  });
});
