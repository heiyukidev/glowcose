import { map } from "lodash";
import { describe, expect, test } from "vitest";

import type { Reading } from "./glucose";
import {
  contextForMealSide,
  groupReadingsByMeal,
  pickAfterReading,
  pickBeforeReading,
  todayMealCards,
} from "./meal";

function reading(
  overrides: Partial<Reading> & Pick<Reading, "_id" | "takenAt" | "context">,
): Reading {
  return {
    userId: "member",
    valueMgDl: 100,
    createdAt: overrides.takenAt,
    ...overrides,
  };
}

describe("groupReadingsByMeal", () => {
  test("puts before and after breakfast on one Meal, before then 1h then 2h", () => {
    const before = reading({
      _id: "before",
      mealId: "breakfast-1",
      context: "before_breakfast",
      takenAt: Date.parse("2026-09-21T08:00:00+02:00"),
      valueMgDl: 90,
    });
    const after2h = reading({
      _id: "after-2h",
      mealId: "breakfast-1",
      context: "after_breakfast",
      postMealOffset: 2,
      takenAt: Date.parse("2026-09-21T10:00:00+02:00"),
      valueMgDl: 120,
    });
    const after1h = reading({
      _id: "after-1h",
      mealId: "breakfast-1",
      context: "after_breakfast",
      postMealOffset: 1,
      takenAt: Date.parse("2026-09-21T09:00:00+02:00"),
      valueMgDl: 140,
    });

    expect(groupReadingsByMeal([after2h, before, after1h])).toEqual([
      {
        id: "breakfast-1",
        slot: "breakfast",
        label: "Petit-déjeuner",
        photos: [],
        readings: [before, after1h, after2h],
      },
    ]);
  });

  test("orders Meals as breakfast, lunch, dinner, then each Other by time", () => {
    const breakfast = reading({
      _id: "breakfast",
      mealId: "b",
      context: "before_breakfast",
      takenAt: Date.parse("2026-09-22T08:00:00+02:00"),
    });
    const lunch = reading({
      _id: "lunch",
      mealId: "l",
      context: "before_lunch",
      takenAt: Date.parse("2026-09-22T12:30:00+02:00"),
    });
    const carriedDinner = reading({
      _id: "carried",
      mealId: "dinner-monday",
      context: "after_dinner",
      postMealOffset: 2,
      takenAt: Date.parse("2026-09-22T00:30:00+02:00"),
    });
    const eveningDinner = reading({
      _id: "evening",
      mealId: "dinner-tuesday",
      context: "before_dinner",
      takenAt: Date.parse("2026-09-22T19:30:00+02:00"),
    });
    const lateOther = reading({
      _id: "late-other",
      mealId: "other-late",
      context: "other",
      takenAt: Date.parse("2026-09-22T16:00:00+02:00"),
    });
    const earlyOther = reading({
      _id: "early-other",
      mealId: "other-early",
      context: "other",
      takenAt: Date.parse("2026-09-22T10:15:00+02:00"),
    });

    const sections = groupReadingsByMeal([
      lateOther,
      eveningDinner,
      earlyOther,
      lunch,
      carriedDinner,
      breakfast,
    ]);

    expect(map(sections, "id")).toEqual([
      "b",
      "l",
      "dinner-monday",
      "dinner-tuesday",
      "other-early",
      "other-late",
    ]);
    expect(map(sections, "label")).toEqual([
      "Petit-déjeuner",
      "Déjeuner",
      "Dîner",
      "Dîner",
      "Autre",
      "Autre",
    ]);
  });

  test("folds an after-reading stored on its own meal into that meal", () => {
    const before = reading({
      _id: "before",
      mealId: "breakfast-before",
      context: "before_breakfast",
      takenAt: Date.parse("2026-09-21T09:13:00+02:00"),
      valueMgDl: 91,
    });
    const after = reading({
      _id: "after",
      mealId: "breakfast-after",
      context: "after_breakfast",
      postMealOffset: 2,
      takenAt: Date.parse("2026-09-21T11:44:00+02:00"),
      valueMgDl: 97,
    });
    const lunch = reading({
      _id: "lunch",
      mealId: "lunch-1",
      context: "before_lunch",
      takenAt: Date.parse("2026-09-21T15:29:00+02:00"),
      valueMgDl: 85,
    });

    const sections = groupReadingsByMeal([after, lunch, before]);

    expect(map(sections, "label")).toEqual(["Petit-déjeuner", "Déjeuner"]);
    expect(map(sections[0]?.readings, "_id")).toEqual(["before", "after"]);
  });

  test("keeps a Reading with no Meal as its own section", () => {
    const orphan = reading({
      _id: "orphan",
      context: "before_lunch",
      takenAt: Date.parse("2026-09-22T12:00:00+02:00"),
    });
    const lunch = reading({
      _id: "lunch",
      mealId: "lunch-1",
      context: "before_lunch",
      takenAt: Date.parse("2026-09-22T12:05:00+02:00"),
    });

    expect(map(groupReadingsByMeal([orphan, lunch]), "id")).toEqual([
      "reading:orphan",
      "lunch-1",
    ]);
  });

  test("puts the Note and Photos on the Meal once", () => {
    const before = reading({
      _id: "before",
      mealId: "dinner-1",
      context: "before_dinner",
      takenAt: Date.parse("2026-09-21T20:00:00+02:00"),
      note: "pâtes",
      photos: [{ url: "https://example.com/pasta.jpg" }],
    });
    const after = reading({
      _id: "after",
      mealId: "dinner-1",
      context: "after_dinner",
      postMealOffset: 2,
      takenAt: Date.parse("2026-09-21T22:00:00+02:00"),
      note: "pâtes",
      photos: [{ url: "https://example.com/pasta.jpg" }],
    });

    expect(groupReadingsByMeal([after, before])).toEqual([
      {
        id: "dinner-1",
        slot: "dinner",
        label: "Dîner",
        note: "pâtes",
        photos: [{ url: "https://example.com/pasta.jpg" }],
        readings: [before, after],
      },
    ]);
  });
});

describe("todayMealCards", () => {
  test("shows three empty shells when there are no Readings", () => {
    expect(todayMealCards([])).toEqual({
      meals: [
        {
          id: "shell:breakfast",
          slot: "breakfast",
          label: "Petit-déjeuner",
          photos: [],
          isShell: true,
        },
        {
          id: "shell:lunch",
          slot: "lunch",
          label: "Déjeuner",
          photos: [],
          isShell: true,
        },
        {
          id: "shell:dinner",
          slot: "dinner",
          label: "Dîner",
          photos: [],
          isShell: true,
        },
      ],
      extras: [],
    });
  });

  test("fills named shells and keeps Autre as an extra", () => {
    const lunchBefore = reading({
      _id: "lb",
      mealId: "lunch-1",
      context: "before_lunch",
      takenAt: Date.parse("2026-09-23T12:00:00+02:00"),
      valueMgDl: 88,
      note: "salade",
    });
    const lunchAfter1 = reading({
      _id: "la1",
      mealId: "lunch-1",
      context: "after_lunch",
      postMealOffset: 1,
      takenAt: Date.parse("2026-09-23T13:00:00+02:00"),
      valueMgDl: 150,
    });
    const lunchAfter2 = reading({
      _id: "la2",
      mealId: "lunch-1",
      context: "after_lunch",
      postMealOffset: 2,
      takenAt: Date.parse("2026-09-23T14:00:00+02:00"),
      valueMgDl: 135,
    });
    const other = reading({
      _id: "o",
      mealId: "other-1",
      context: "other",
      takenAt: Date.parse("2026-09-23T16:00:00+02:00"),
      valueMgDl: 110,
    });

    const { meals, extras } = todayMealCards([
      lunchAfter1,
      other,
      lunchAfter2,
      lunchBefore,
    ]);

    expect(map(meals, "slot")).toEqual(["breakfast", "lunch", "dinner"]);
    expect(meals[0]?.isShell).toBe(true);
    expect(meals[1]).toMatchObject({
      id: "lunch-1",
      slot: "lunch",
      note: "salade",
      isShell: false,
      before: lunchBefore,
      after: lunchAfter2,
    });
    expect(meals[2]?.isShell).toBe(true);
    expect(map(extras, "id")).toEqual(["other-1"]);
  });

  test("maps meal side to Reading context", () => {
    expect(contextForMealSide("lunch", "before")).toBe("before_lunch");
    expect(contextForMealSide("lunch", "after")).toBe("after_lunch");
    expect(contextForMealSide("dinner", "after")).toBe("after_dinner");
  });

  test("pickAfterReading prefers 2h over 1h", () => {
    const at1 = reading({
      _id: "1",
      context: "after_lunch",
      postMealOffset: 1,
      takenAt: 1,
    });
    const at2 = reading({
      _id: "2",
      context: "after_lunch",
      postMealOffset: 2,
      takenAt: 2,
    });
    expect(pickAfterReading([at1, at2])?._id).toBe("2");
    expect(pickBeforeReading([at1, at2])).toBeUndefined();
  });
});
