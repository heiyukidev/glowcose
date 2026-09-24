import { describe, expect, test } from "vitest";

import {
  afterContextForBefore,
  canOfferRappel,
  formatRappelClock,
  pruneFulfilledRappels,
  rappelFireAt,
  rappelNotificationBody,
  removeActiveRappel,
  shouldOfferRappelAfterSave,
  upsertActiveRappel,
  RAPPEL_DELAY_MS,
  type ActiveRappel,
} from "./rappel";

describe("canOfferRappel", () => {
  test("offers when before exists and after is missing on a named meal", () => {
    expect(
      canOfferRappel({
        before: { _id: "r1" },
        after: undefined,
        slot: "lunch",
      }),
    ).toBe(true);
  });

  test("does not offer when after already exists", () => {
    expect(
      canOfferRappel({
        before: { _id: "r1" },
        after: { _id: "r2" },
        slot: "lunch",
      }),
    ).toBe(false);
  });

  test("does not offer without a before", () => {
    expect(
      canOfferRappel({
        before: undefined,
        after: undefined,
        slot: "lunch",
      }),
    ).toBe(false);
  });
});

describe("shouldOfferRappelAfterSave", () => {
  test("offers after saving a before reading", () => {
    expect(shouldOfferRappelAfterSave("before_lunch")).toBe(true);
  });

  test("does not offer after saving an after or other reading", () => {
    expect(shouldOfferRappelAfterSave("after_lunch")).toBe(false);
    expect(shouldOfferRappelAfterSave("other")).toBe(false);
  });
});

describe("rappelFireAt", () => {
  test("is two hours after now", () => {
    const now = Date.parse("2026-09-24T12:05:00+02:00");
    expect(rappelFireAt(now)).toBe(now + RAPPEL_DELAY_MS);
    expect(RAPPEL_DELAY_MS).toBe(2 * 60 * 60 * 1000);
  });
});

describe("formatRappelClock", () => {
  test("formats local HH:mm for the fire time", () => {
    const fireAt = Date.parse("2026-09-24T14:05:00+02:00");
    expect(formatRappelClock(fireAt, "Europe/Paris")).toBe("14:05");
  });
});

describe("rappelNotificationBody", () => {
  test("names the meal", () => {
    expect(rappelNotificationBody("Déjeuner")).toBe(
      "Heure de l’après · Déjeuner",
    );
  });
});

describe("afterContextForBefore", () => {
  test("maps before contexts to the matching after", () => {
    expect(afterContextForBefore("before_breakfast")).toBe("after_breakfast");
    expect(afterContextForBefore("before_lunch")).toBe("after_lunch");
    expect(afterContextForBefore("before_dinner")).toBe("after_dinner");
  });

  test("returns undefined for after or other", () => {
    expect(afterContextForBefore("after_lunch")).toBeUndefined();
    expect(afterContextForBefore("other")).toBeUndefined();
  });
});

describe("upsertActiveRappel / removeActiveRappel", () => {
  const lunch: ActiveRappel = {
    mealId: "meal-lunch",
    mealLabel: "Déjeuner",
    afterContext: "after_lunch",
    fireAt: 1,
  };
  const dinner: ActiveRappel = {
    mealId: "meal-dinner",
    mealLabel: "Dîner",
    afterContext: "after_dinner",
    fireAt: 2,
  };

  test("replaces an existing Rappel for the same Meal", () => {
    const replaced: ActiveRappel = { ...lunch, fireAt: 99 };
    expect(upsertActiveRappel([lunch, dinner], replaced)).toEqual([
      replaced,
      dinner,
    ]);
  });

  test("removes by mealId", () => {
    expect(removeActiveRappel([lunch, dinner], "meal-lunch")).toEqual([dinner]);
  });
});

describe("pruneFulfilledRappels", () => {
  test("cancels Rappels whose Meal now has an after Reading", () => {
    const lunch: ActiveRappel = {
      mealId: "meal-lunch",
      mealLabel: "Déjeuner",
      afterContext: "after_lunch",
      fireAt: 1,
    };
    const dinner: ActiveRappel = {
      mealId: "meal-dinner",
      mealLabel: "Dîner",
      afterContext: "after_dinner",
      fireAt: 2,
    };
    expect(
      pruneFulfilledRappels([lunch, dinner], [
        { mealId: "meal-lunch", context: "before_lunch" },
        { mealId: "meal-lunch", context: "after_lunch" },
        { mealId: "meal-dinner", context: "before_dinner" },
      ]),
    ).toEqual({ kept: [dinner], cancelled: [lunch] });
  });
});
