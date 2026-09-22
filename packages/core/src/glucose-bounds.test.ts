import { describe, expect, test } from "vitest";

import {
  assertSavableReading,
  bandFromDraft,
  clampNote,
  glucoseInputBounds,
  isOrderedBand,
  isOrderedPreset,
  MAX_NOTE_LENGTH,
  resolvedThresholds,
  THRESHOLD_PRESETS,
} from "./glucose";

const FASTING = THRESHOLD_PRESETS.gestational.beforeMeal;

describe("glucose bounds", () => {
  test("accepts an ordered band and rejects an inverted one", () => {
    expect(isOrderedBand(FASTING)).toBe(true);
    expect(isOrderedBand({ ...FASTING, hypoBelow: 200 })).toBe(false);
    expect(isOrderedBand({ ...FASTING, hypoBelow: 10 })).toBe(false);
    expect(isOrderedBand({ ...FASTING, orangeMax: 900 })).toBe(false);
  });

  test("rejects a preset when any band is unordered", () => {
    expect(isOrderedPreset(THRESHOLD_PRESETS.gestational)).toBe(true);
    expect(
      isOrderedPreset({
        ...THRESHOLD_PRESETS.type2,
        other: { hypoBelow: 0, greenMax: 0, orangeMax: 0 },
      }),
    ).toBe(false);
  });

  test("falls back to the diabetes preset when stored bands are unusable", () => {
    const resolved = resolvedThresholds("type1", {
      ...THRESHOLD_PRESETS.type1,
      beforeMeal: { hypoBelow: 0, greenMax: 1, orangeMax: 2 },
    });
    expect(resolved.beforeMeal).toEqual(THRESHOLD_PRESETS.type1.beforeMeal);
  });

  test("parses a threshold draft only when the three values stay ordered", () => {
    expect(
      bandFromDraft({
        hypoBelow: "80",
        greenMax: "110",
        orangeMax: "140",
      }),
    ).toEqual({ hypoBelow: 80, greenMax: 110, orangeMax: 140 });
    expect(
      bandFromDraft({
        hypoBelow: "",
        greenMax: "110",
        orangeMax: "140",
      }),
    ).toBeNull();
  });

  test("clamps a long meal note and drops a blank one", () => {
    expect(clampNote("  pâtes  ")).toBe("pâtes");
    expect(clampNote("   ")).toBeUndefined();
    expect(clampNote("a".repeat(MAX_NOTE_LENGTH + 40))?.length).toBe(
      MAX_NOTE_LENGTH,
    );
  });

  test("refuses a reading outside the capillary range", () => {
    expect(() =>
      assertSavableReading({ valueMgDl: 10, takenAt: Date.parse("2026-01-01") }),
    ).toThrow("Mesure invalide");
    expect(() =>
      assertSavableReading({ valueMgDl: 90, takenAt: Number.NaN }),
    ).toThrow("Mesure invalide");
  });

  test("names the range the field will accept", () => {
    expect(glucoseInputBounds("gL")).toEqual({
      min: "0,20 g/L",
      max: "6 g/L",
    });
  });
});
