import { describe, expect, it } from "vitest";

import {
  canMoveJournalForward,
  dayScoreTone,
  journalDayLabel,
  readingsOnLocalDay,
  shiftLocalDay,
} from "./journal-day";
import type { Reading } from "./glucose";

const today = new Date(2026, 8, 25, 15, 0, 0);

function reading(takenAt: number): Reading {
  return {
    _id: String(takenAt),
    userId: "u",
    valueMgDl: 90,
    context: "before_breakfast",
    takenAt,
    createdAt: takenAt,
  };
}

describe("journal day", () => {
  it("stops the forward step on today", () => {
    expect(canMoveJournalForward(today, today)).toBe(false);
    expect(canMoveJournalForward(shiftLocalDay(today, -1), today)).toBe(true);
  });

  it("labels today and a past day", () => {
    expect(journalDayLabel(today, today)).toBe("Aujourd’hui");
    expect(journalDayLabel(shiftLocalDay(today, -3), today)).toBe("22 Sept");
  });

  it("keeps only readings from the selected day", () => {
    const selected = shiftLocalDay(today, -1);
    const rows = readingsOnLocalDay(
      [reading(selected.getTime()), reading(today.getTime())],
      selected,
    );
    expect(rows).toHaveLength(1);
  });

  it("picks the day glow from the worst reading", () => {
    expect(dayScoreTone([])).toBeNull();
    expect(dayScoreTone(["in_range", "in_range"])).toBe("green");
    expect(dayScoreTone(["in_range", "high"])).toBe("yellow");
    expect(dayScoreTone(["high", "very_high"])).toBe("red");
    expect(dayScoreTone(["in_range", "hypo"])).toBe("red");
  });
});
