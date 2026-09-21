import { describe, expect, test } from "vitest";

import {
  findGroupedMeal,
  localDateKey,
  mealSlotForContext,
  mergeMealNotes,
  mergeMealPhotos,
} from "./meal";

const PARIS = "Europe/Paris";

function atParis(isoLocal: string): number {
  return new Date(isoLocal).getTime();
}

describe("mealSlotForContext", () => {
  test("maps before and after breakfast to the breakfast slot", () => {
    expect(mealSlotForContext("before_breakfast")).toBe("breakfast");
    expect(mealSlotForContext("after_breakfast")).toBe("breakfast");
  });

  test("maps other to the other slot", () => {
    expect(mealSlotForContext("other")).toBe("other");
  });
});

describe("findGroupedMeal", () => {
  test("does not group two Other readings on the same day", () => {
    const takenAt = atParis("2026-09-21T16:00:00+02:00");
    const existing = [
      {
        id: "snack-1",
        slot: "other" as const,
        anchorAt: atParis("2026-09-21T11:00:00+02:00"),
      },
    ];
    expect(
      findGroupedMeal(existing, "other", takenAt, "other", PARIS),
    ).toBeUndefined();
  });

  test("groups after lunch with before lunch on the same local day", () => {
    const before = atParis("2026-09-21T12:00:00+02:00");
    const after = atParis("2026-09-21T14:00:00+02:00");
    const existing = [
      { id: "lunch-1", slot: "lunch" as const, anchorAt: before },
    ];
    expect(findGroupedMeal(existing, "lunch", after, "after_lunch", PARIS)).toEqual(
      existing[0],
    );
  });

  test("groups after dinner past midnight with dinner earlier that evening", () => {
    const before = atParis("2026-09-21T21:30:00+02:00");
    const after = atParis("2026-09-22T00:15:00+02:00");
    const existing = [
      { id: "dinner-1", slot: "dinner" as const, anchorAt: before },
    ];
    expect(
      findGroupedMeal(existing, "dinner", after, "after_dinner", PARIS),
    ).toEqual(existing[0]);
  });

  test("does not group an after reading on the next day beyond 12 hours", () => {
    const before = atParis("2026-09-21T21:30:00+02:00");
    const after = atParis("2026-09-22T10:00:00+02:00");
    const existing = [
      { id: "dinner-1", slot: "dinner" as const, anchorAt: before },
    ];
    expect(
      findGroupedMeal(existing, "dinner", after, "after_dinner", PARIS),
    ).toBeUndefined();
  });
});

describe("localDateKey", () => {
  test("uses the slot timezone, not UTC date", () => {
    const lateParis = atParis("2026-09-21T23:30:00+02:00");
    expect(localDateKey(lateParis, PARIS)).toBe("2026-09-21");
  });
});

describe("mergeMealNotes", () => {
  test("keeps the existing note when the incoming note is empty", () => {
    expect(mergeMealNotes("croissant", undefined)).toBe("croissant");
  });

  test("keeps both texts when they differ", () => {
    expect(mergeMealNotes("croissant", "café")).toBe("croissant\ncafé");
  });

  test("does not duplicate the same note", () => {
    expect(mergeMealNotes("croissant", "croissant")).toBe("croissant");
  });
});

describe("mergeMealPhotos", () => {
  test("unions photos and caps at 4", () => {
    const existing = [
      { url: "a" },
      { url: "b" },
      { url: "c" },
    ];
    const incoming = [{ url: "c" }, { url: "d" }, { url: "e" }];
    expect(mergeMealPhotos(existing, incoming)).toEqual([
      { url: "a" },
      { url: "b" },
      { url: "c" },
      { url: "d" },
    ]);
  });
});
