import { map } from "lodash";

import { DEMO_USER_ID } from "@/lib/runtime";
import type { PostMealOffset, Reading, ReadingContext } from "@/lib/glucose";

type SeedSpec = {
  daysAgo: number;
  hour: number;
  minute: number;
  valueGl: number;
  context: ReadingContext;
  postMealOffset?: PostMealOffset;
  note?: string;
};

const SEED_SPECS: SeedSpec[] = [
  {
    daysAgo: 0,
    hour: 7,
    minute: 32,
    valueGl: 0.88,
    context: "before_breakfast",
  },
  {
    daysAgo: 0,
    hour: 9,
    minute: 40,
    valueGl: 1.18,
    context: "after_breakfast",
    postMealOffset: 2,
    note: "Pain complet + fromage blanc",
  },
  {
    daysAgo: 1,
    hour: 7,
    minute: 18,
    valueGl: 0.98,
    context: "before_breakfast",
    note: "Un peu au-dessus ce matin",
  },
  {
    daysAgo: 1,
    hour: 10,
    minute: 5,
    valueGl: 1.31,
    context: "after_breakfast",
    postMealOffset: 2,
    note: "Croissant (exception)",
  },
  {
    daysAgo: 1,
    hour: 12,
    minute: 10,
    valueGl: 0.91,
    context: "before_lunch",
  },
  {
    daysAgo: 1,
    hour: 14,
    minute: 20,
    valueGl: 1.12,
    context: "after_lunch",
    postMealOffset: 2,
  },
  {
    daysAgo: 1,
    hour: 20,
    minute: 15,
    valueGl: 1.68,
    context: "after_dinner",
    postMealOffset: 1,
    note: "Pâtes, portion généreuse",
  },
  {
    daysAgo: 2,
    hour: 7,
    minute: 10,
    valueGl: 0.64,
    context: "before_breakfast",
    note: "Un peu basse au réveil",
  },
  {
    daysAgo: 2,
    hour: 12,
    minute: 50,
    valueGl: 1.05,
    context: "after_lunch",
    postMealOffset: 1,
    note: "Salade lentilles",
  },
  {
    daysAgo: 2,
    hour: 16,
    minute: 30,
    valueGl: 0.92,
    context: "other",
    note: "Amande + yaourt",
  },
  {
    daysAgo: 2,
    hour: 21,
    minute: 5,
    valueGl: 1.16,
    context: "after_dinner",
    postMealOffset: 2,
  },
  {
    daysAgo: 3,
    hour: 7,
    minute: 25,
    valueGl: 0.86,
    context: "before_breakfast",
  },
  {
    daysAgo: 3,
    hour: 9,
    minute: 50,
    valueGl: 1.22,
    context: "after_breakfast",
    postMealOffset: 2,
  },
  {
    daysAgo: 3,
    hour: 19,
    minute: 5,
    valueGl: 1.08,
    context: "before_dinner",
  },
  {
    daysAgo: 5,
    hour: 8,
    minute: 0,
    valueGl: 0.9,
    context: "before_breakfast",
  },
  {
    daysAgo: 8,
    hour: 14,
    minute: 10,
    valueGl: 1.28,
    context: "after_lunch",
    postMealOffset: 2,
  },
];

function atDaysAgo(daysAgo: number, hour: number, minute: number): number {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

export function createSeedReadings(): Reading[] {
  const now = Date.now();
  return map(SEED_SPECS, (spec, index) => {
    const takenAt = atDaysAgo(spec.daysAgo, spec.hour, spec.minute);
    return {
      _id: `seed-${index + 1}`,
      userId: DEMO_USER_ID,
      valueMgDl: spec.valueGl * 100,
      context: spec.context,
      postMealOffset: spec.postMealOffset,
      note: spec.note,
      takenAt,
      createdAt: Math.min(takenAt, now),
    };
  });
}
