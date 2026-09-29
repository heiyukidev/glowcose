import { describe, expect, test } from "vitest";
import { find, map, sortBy } from "lodash";

import type { LocalLog, StoredMeal, StoredReading } from "./meal";
import {
  catchUp,
  choose,
  dismissArchive,
  emptyDeviceCarnet,
  usesUnsignedJournal,
  record,
  signOut,
  view,
  type RecordMeta,
} from "./offline-carnet";

const TZ = "Europe/Paris";
const MEMBER = "member-a";
const OTHER = "member-b";

function at(iso: string): number {
  return Date.parse(iso);
}

function meal(
  overrides: Partial<StoredMeal> & Pick<StoredMeal, "_id" | "slot" | "anchorAt">,
): StoredMeal {
  return {
    photos: [],
    createdAt: overrides.anchorAt,
    ...overrides,
  };
}

function reading(
  overrides: Partial<StoredReading> &
    Pick<StoredReading, "_id" | "mealId" | "valueMgDl" | "context" | "takenAt">,
): StoredReading {
  return {
    userId: MEMBER,
    recordedBy: MEMBER,
    createdAt: overrides.takenAt,
    ...overrides,
  };
}

function meta(overrides?: Partial<RecordMeta>): RecordMeta {
  return {
    readingId: "r-local",
    mealId: "m-local",
    userId: MEMBER,
    now: at("2026-09-27T13:02:00+02:00"),
    recordedBy: MEMBER,
    timeZone: TZ,
    archivedReadingId: "r-archived",
    ...overrides,
  };
}

function open(shared: LocalLog = { meals: [], readings: [] }) {
  return catchUp(emptyDeviceCarnet(), shared, TZ).device;
}

describe("offline carnet", () => {
  test("a device that has not opened the Carnet online has nothing to show", () => {
    const saved = record(
      emptyDeviceCarnet(),
      {
        kind: "save",
        input: {
          valueMgDl: 142,
          context: "before_lunch",
          takenAt: at("2026-09-27T13:02:00+02:00"),
        },
      },
      meta(),
    );
    expect(view(saved)).toEqual({ readings: [], clashes: [], archived: [] });
  });

  test("a Reading saved after opening is on the Carnet immediately", () => {
    const saved = record(
      open(),
      {
        kind: "save",
        input: {
          valueMgDl: 142,
          context: "before_lunch",
          takenAt: at("2026-09-27T13:02:00+02:00"),
          note: "pâtes",
        },
      },
      meta(),
    );
    expect(view(saved).readings).toEqual([
      expect.objectContaining({
        _id: "r-local",
        valueMgDl: 142,
        context: "before_lunch",
        note: "pâtes",
      }),
    ]);
    expect(view(saved).clashes).toEqual([]);
  });

  test("catch-up sends a saved Reading once", () => {
    const saved = record(
      open(),
      {
        kind: "save",
        input: {
          valueMgDl: 142,
          context: "before_lunch",
          takenAt: at("2026-09-27T13:02:00+02:00"),
        },
      },
      meta(),
    );
    const first = catchUp(saved, { meals: [], readings: [] }, TZ);
    expect(first.outbound).toEqual([
      expect.objectContaining({
        reading: expect.objectContaining({ _id: "r-local", valueMgDl: 142 }),
        meal: expect.objectContaining({ slot: "lunch" }),
      }),
    ]);
    const shared = {
      meals: first.outbound.map((change) => change.meal),
      readings: first.outbound.map((change) => change.reading),
    };
    const second = catchUp(first.device, shared, TZ);
    expect(second.outbound).toEqual([]);
  });

  test("an after saved past midnight stays on the dinner the Member saw", () => {
    const dinnerAt = at("2026-09-27T20:00:00+02:00");
    const afterAt = at("2026-09-28T00:30:00+02:00");
    const shared: LocalLog = {
      meals: [meal({ _id: "dinner", slot: "dinner", anchorAt: dinnerAt })],
      readings: [
        reading({
          _id: "before",
          mealId: "dinner",
          valueMgDl: 110,
          context: "before_dinner",
          takenAt: dinnerAt,
        }),
      ],
    };
    const saved = record(
      open(shared),
      {
        kind: "save",
        input: { valueMgDl: 160, context: "after_dinner", takenAt: afterAt },
      },
      meta({ readingId: "after", mealId: "after-meal" }),
    );
    const caught = catchUp(saved, shared, TZ);
    expect(caught.outbound).toEqual([
      expect.objectContaining({
        reading: expect.objectContaining({
          _id: "after",
          context: "after_dinner",
          mealId: "dinner",
        }),
        meal: expect.objectContaining({ _id: "dinner", slot: "dinner" }),
      }),
    ]);
  });

  test("a second lunch joins the Meal already on the shared Carnet", () => {
    const lunchAt = at("2026-09-27T13:00:00+02:00");
    const shared: LocalLog = {
      meals: [meal({ _id: "server-lunch", slot: "lunch", anchorAt: lunchAt, note: "pizza" })],
      readings: [
        reading({
          _id: "server-before",
          mealId: "server-lunch",
          valueMgDl: 138,
          context: "before_lunch",
          takenAt: lunchAt,
          userId: OTHER,
          recordedBy: OTHER,
        }),
      ],
    };
    const saved = record(
      open(),
      {
        kind: "save",
        input: {
          valueMgDl: 142,
          context: "before_lunch",
          takenAt: at("2026-09-27T13:02:00+02:00"),
          note: "pâtes",
        },
      },
      meta(),
    );
    const caught = catchUp(saved, shared, TZ);
    expect(view(caught.device).readings.map((item) => item.valueMgDl)).toEqual([142]);
    expect(view(caught.device).readings[0]?.mealId).toBe("server-lunch");
    expect(caught.outbound.map((change) => change.reading._id)).not.toContain("r-local");
    expect(view(caught.device).clashes).toEqual([
      expect.objectContaining({
        mine: expect.objectContaining({ valueMgDl: 142 }),
        shared: expect.objectContaining({ valueMgDl: 138 }),
      }),
    ]);
  });

  test("keeping a Clash archives the shared Reading and leaves yours on the Phase", () => {
    const opened = clashOverLunch();
    const chosen = choose(opened.device, opened.clashId, "keep", {
      now: at("2026-09-27T15:00:00+02:00"),
      archivedReadingId: "r-archived",
    });
    const seen = view(chosen);
    expect(seen.readings.map((item) => item.valueMgDl)).toEqual([142]);
    expect(seen.archived).toEqual([
      expect.objectContaining({ valueMgDl: 138, note: "pizza" }),
    ]);
    expect(seen.readings[0]?.note).toBe("pâtes");
    expect(seen.clashes).toEqual([]);
    const sent = catchUp(chosen, opened.shared, TZ);
    expect(sortBy(map(sent.outbound, (change) => change.reading.valueMgDl))).toEqual([
      138, 142,
    ]);
  });

  test("dropping a Clash archives yours and leaves the shared Reading on the Phase", () => {
    const opened = clashOverLunch();
    const chosen = choose(opened.device, opened.clashId, "drop", {
      now: at("2026-09-27T15:00:00+02:00"),
      archivedReadingId: "r-archived",
    });
    const seen = view(chosen);
    expect(seen.readings.map((item) => item.valueMgDl)).toEqual([138]);
    expect(seen.archived).toEqual([
      expect.objectContaining({ _id: "r-local", valueMgDl: 142, note: "pâtes" }),
    ]);
  });

  test("the value you do not keep on one Reading is archived at the same time and Phase", () => {
    const takenAt = at("2026-09-27T13:00:00+02:00");
    const shared: LocalLog = {
      meals: [meal({ _id: "lunch", slot: "lunch", anchorAt: takenAt })],
      readings: [
        reading({
          _id: "r1",
          mealId: "lunch",
          valueMgDl: 150,
          context: "before_lunch",
          takenAt,
          userId: OTHER,
          recordedBy: OTHER,
        }),
      ],
    };
    const edited = record(
      open({
        meals: shared.meals,
        readings: [
          reading({
            _id: "r1",
            mealId: "lunch",
            valueMgDl: 140,
            context: "before_lunch",
            takenAt,
          }),
        ],
      }),
      {
        kind: "update",
        id: "r1",
        input: { valueMgDl: 142, context: "before_lunch", takenAt },
      },
      meta(),
    );
    const caught = catchUp(edited, shared, TZ);
    const chosen = choose(caught.device, caught.device.clashes[0]!.id, "keep", {
      now: at("2026-09-27T15:00:00+02:00"),
      archivedReadingId: "r-archived",
    });
    expect(view(chosen).readings).toEqual([
      expect.objectContaining({ _id: "r1", valueMgDl: 142 }),
    ]);
    expect(view(chosen).archived).toEqual([
      expect.objectContaining({
        _id: "r-archived",
        valueMgDl: 150,
        context: "before_lunch",
        takenAt,
        recordedBy: OTHER,
      }),
    ]);
  });

  test("1h and 2h do not Clash", () => {
    const lunchAt = at("2026-09-27T13:00:00+02:00");
    const shared: LocalLog = {
      meals: [meal({ _id: "lunch", slot: "lunch", anchorAt: lunchAt })],
      readings: [
        reading({
          _id: "one-hour",
          mealId: "lunch",
          valueMgDl: 180,
          context: "after_lunch",
          postMealOffset: 1,
          takenAt: at("2026-09-27T14:00:00+02:00"),
        }),
      ],
    };
    const saved = record(
      open(shared),
      {
        kind: "save",
        input: {
          valueMgDl: 140,
          context: "after_lunch",
          postMealOffset: 2,
          takenAt: at("2026-09-27T15:00:00+02:00"),
        },
      },
      meta({ readingId: "two-hour", mealId: "lunch-2" }),
    );
    const caught = catchUp(saved, shared, TZ);
    expect(view(caught.device).clashes).toEqual([]);
    expect(view(caught.device).readings.map((item) => item._id).sort()).toEqual([
      "one-hour",
      "two-hour",
    ]);
  });

  test("sign out without the shared Carnet leaves the device copy in place", () => {
    const saved = record(
      open(),
      {
        kind: "save",
        input: {
          valueMgDl: 142,
          context: "before_lunch",
          takenAt: at("2026-09-27T13:02:00+02:00"),
        },
      },
      meta(),
    );
    const result = signOut(saved, null, TZ);
    expect(result.status).toBe("stay");
    if (result.status === "stay") {
      expect(result.reason).toBe("offline");
      expect(view(result.device).readings.map((item) => item.valueMgDl)).toEqual([142]);
    }
  });

  test("sign out with an open Clash does not clear the device", () => {
    const opened = clashOverLunch();
    const result = signOut(opened.device, opened.shared, TZ);
    expect(result.status).toBe("stay");
    if (result.status === "stay") {
      expect(result.reason).toBe("clash");
    }
  });

  test("sign out finishes catch-up of a Reading that does not Clash", () => {
    const saved = record(
      open(),
      {
        kind: "save",
        input: {
          valueMgDl: 142,
          context: "before_lunch",
          takenAt: at("2026-09-27T13:02:00+02:00"),
        },
      },
      meta(),
    );
    const result = signOut(saved, { meals: [], readings: [] }, TZ);
    expect(result).toEqual({
      status: "clear",
      outbound: [
        expect.objectContaining({
          reading: expect.objectContaining({ valueMgDl: 142 }),
        }),
      ],
    });
  });

  test("a Note-only disagreement is remembered on the Meal", () => {
    const takenAt = at("2026-09-27T13:00:00+02:00");
    const base: LocalLog = {
      meals: [meal({ _id: "lunch", slot: "lunch", anchorAt: takenAt, note: "riz" })],
      readings: [
        reading({
          _id: "r1",
          mealId: "lunch",
          valueMgDl: 142,
          context: "before_lunch",
          takenAt,
        }),
      ],
    };
    const edited = record(
      open(base),
      {
        kind: "update",
        id: "r1",
        input: { valueMgDl: 142, context: "before_lunch", takenAt, note: "pâtes" },
      },
      meta(),
    );
    const shared: LocalLog = {
      meals: [meal({ _id: "lunch", slot: "lunch", anchorAt: takenAt, note: "pizza" })],
      readings: base.readings,
    };
    const caught = catchUp(edited, shared, TZ);
    const chosen = choose(caught.device, caught.device.clashes[0]!.id, "keep", {
      now: takenAt,
      archivedReadingId: "unused",
    });
    expect(view(chosen).readings).toEqual([
      expect.objectContaining({ _id: "r1", valueMgDl: 142, note: "pâtes" }),
    ]);
    expect(view(chosen).archived).toEqual([]);
    const applied = record(chosen, { kind: "apply-note", mealId: "lunch" }, meta());
    expect(view(applied).readings[0]?.note).toBe("pizza");
  });

  test("Photos already on the shared Meal stay, and a fifth Photo waits on the device", () => {
    const lunchAt = at("2026-09-27T13:00:00+02:00");
    const sharedPhotos = [
      { storageId: "p1" },
      { storageId: "p2" },
      { storageId: "p3" },
      { storageId: "p4" },
    ];
    const shared: LocalLog = {
      meals: [meal({ _id: "lunch", slot: "lunch", anchorAt: lunchAt, photos: sharedPhotos })],
      readings: [
        reading({
          _id: "before",
          mealId: "lunch",
          valueMgDl: 110,
          context: "before_lunch",
          takenAt: lunchAt,
        }),
      ],
    };
    const saved = record(
      open(shared),
      {
        kind: "save",
        input: {
          valueMgDl: 160,
          context: "after_lunch",
          takenAt: at("2026-09-27T15:00:00+02:00"),
          photos: [...sharedPhotos, { storageId: "p5" }],
        },
      },
      meta({ readingId: "after", mealId: "lunch" }),
    );
    const caught = catchUp(saved, shared, TZ);
    const sent = caught.outbound.find((change) => change.reading._id === "after");
    expect(sent?.meal.photos).toEqual(sharedPhotos);
    expect(
      caught.device.local.meals.find((item) => item._id === "lunch")?.photos,
    ).toEqual([...sharedPhotos, { storageId: "p5" }]);
  });

  test("restoring onto a free Phase puts the Reading back without changing the Note", () => {
    const takenAt = at("2026-09-27T13:00:00+02:00");
    const seeded = open({
      meals: [meal({ _id: "lunch", slot: "lunch", anchorAt: takenAt, note: "pâtes" })],
      readings: [
        reading({
          _id: "r1",
          mealId: "lunch",
          valueMgDl: 142,
          context: "before_lunch",
          takenAt,
          archivedAt: takenAt,
          rememberedNote: "pizza",
        }),
      ],
    });
    const restored = record(seeded, { kind: "restore", id: "r1" }, meta());
    expect(view(restored).readings).toEqual([
      expect.objectContaining({ _id: "r1", valueMgDl: 142, note: "pâtes" }),
    ]);
    expect(view(restored).clashes).toEqual([]);
  });

  test("a Reading this device did not change is adopted, not a Clash", () => {
    const takenAt = at("2026-09-27T13:00:00+02:00");
    const opened = open({
      meals: [meal({ _id: "lunch", slot: "lunch", anchorAt: takenAt })],
      readings: [
        reading({
          _id: "r1",
          mealId: "lunch",
          valueMgDl: 85,
          context: "before_lunch",
          takenAt,
        }),
      ],
    });
    const shared: LocalLog = {
      meals: opened.local.meals,
      readings: [
        reading({
          _id: "r1",
          mealId: "lunch",
          valueMgDl: 93,
          context: "before_lunch",
          takenAt,
        }),
      ],
    };
    const caught = catchUp(opened, shared, TZ);
    expect(view(caught.device).clashes).toEqual([]);
    expect(view(caught.device).readings).toEqual([
      expect.objectContaining({ _id: "r1", valueMgDl: 93 }),
    ]);
    expect(caught.outbound).toEqual([]);
  });

  test("an archived Reading already on the Carnet is not a card to dismiss", () => {
    const takenAt = at("2026-09-27T13:00:00+02:00");
    const opened = open({
      meals: [meal({ _id: "lunch", slot: "lunch", anchorAt: takenAt })],
      readings: [
        reading({
          _id: "live",
          mealId: "lunch",
          valueMgDl: 93,
          context: "before_lunch",
          takenAt,
        }),
        reading({
          _id: "old",
          mealId: "lunch",
          valueMgDl: 85,
          context: "before_lunch",
          takenAt,
          archivedAt: takenAt,
        }),
      ],
    });
    expect(view(opened).archived).toEqual([]);
    expect(view(opened).clashes).toEqual([]);
    expect(view(opened).readings).toEqual([
      expect.objectContaining({ _id: "live", valueMgDl: 93 }),
    ]);
  });

  test("choosing a Clash stays chosen while the shared Carnet still has the other value", () => {
    const opened = clashOverLunch();
    const chosen = choose(opened.device, opened.clashId, "drop", {
      now: at("2026-09-27T15:00:00+02:00"),
      archivedReadingId: "r-archived",
    });
    const once = catchUp(chosen, opened.shared, TZ);
    const twice = catchUp(once.device, opened.shared, TZ);
    expect(view(twice.device).clashes).toEqual([]);
    expect(view(twice.device).readings).toEqual([
      expect.objectContaining({ valueMgDl: 138 }),
    ]);
  });

  test("a Member’s own Archive does not offer restore", () => {
    const takenAt = at("2026-09-27T13:00:00+02:00");
    const opened = open({
      meals: [meal({ _id: "lunch", slot: "lunch", anchorAt: takenAt })],
      readings: [
        reading({
          _id: "r1",
          mealId: "lunch",
          valueMgDl: 93,
          context: "before_lunch",
          takenAt,
        }),
      ],
    });
    const archived = record(opened, { kind: "archive", id: "r1" }, meta());
    expect(view(archived).readings).toEqual([]);
    expect(view(archived).archived).toEqual([]);
    expect(
      find(archived.local.readings, (reading) => reading._id === "r1")?.archivedAt,
    ).toBeTruthy();
  });

  test("a Clash leftover stays restorable until Fermer, including after catch-up", () => {
    const opened = clashOverLunch();
    const chosen = choose(opened.device, opened.clashId, "drop", {
      now: at("2026-09-27T15:00:00+02:00"),
      archivedReadingId: "r-archived",
    });
    const caught = catchUp(chosen, opened.shared, TZ);
    expect(view(caught.device).archived).toEqual([
      expect.objectContaining({ _id: "r-local", valueMgDl: 142 }),
    ]);
    const hidden = dismissArchive(caught.device, "r-local");
    expect(view(hidden).archived).toEqual([]);
  });

  test("Fermer hides an archive this device just set aside and leaves the Reading archived", () => {
    const opened = clashOverLunch();
    const chosen = choose(opened.device, opened.clashId, "drop", {
      now: at("2026-09-27T15:00:00+02:00"),
      archivedReadingId: "r-archived",
    });
    expect(view(chosen).archived).toEqual([
      expect.objectContaining({ _id: "r-local", valueMgDl: 142 }),
    ]);
    const hidden = dismissArchive(chosen, "r-local");
    expect(view(hidden).archived).toEqual([]);
    expect(view(hidden).readings).toEqual([
      expect.objectContaining({ valueMgDl: 138 }),
    ]);
    expect(
      find(hidden.local.readings, (reading) => reading._id === "r-local")?.archivedAt,
    ).toBeTruthy();
  });

  test("an opened Carnet stays the log when the session drops", () => {
    expect(usesUnsignedJournal(emptyDeviceCarnet(), false)).toBe(true);
    expect(usesUnsignedJournal(open(), false)).toBe(false);
    expect(usesUnsignedJournal(emptyDeviceCarnet(), true)).toBe(false);
  });

  test("a save on an opened Carnet stays there when the session is offline", () => {
    const opened = open();
    const saved = record(
      opened,
      {
        kind: "save",
        input: {
          valueMgDl: 110,
          context: "before_breakfast",
          takenAt: at("2026-09-27T08:00:00+02:00"),
        },
      },
      meta({ readingId: "plane", mealId: "plane-meal" }),
    );
    const caught = catchUp(saved, { meals: [], readings: [] }, TZ);
    expect(view(caught.device).readings).toEqual([
      expect.objectContaining({ _id: "plane", valueMgDl: 110 }),
    ]);
    expect(caught.outbound.map((change) => change.reading._id)).toEqual(["plane"]);
  });

  test("restoring onto an occupied Phase is a Clash", () => {
    const takenAt = at("2026-09-27T13:00:00+02:00");
    const seeded = open({
      meals: [meal({ _id: "lunch", slot: "lunch", anchorAt: takenAt, note: "pâtes" })],
      readings: [
        reading({
          _id: "live",
          mealId: "lunch",
          valueMgDl: 138,
          context: "before_lunch",
          takenAt,
        }),
        reading({
          _id: "old",
          mealId: "lunch",
          valueMgDl: 142,
          context: "before_lunch",
          takenAt,
          archivedAt: takenAt,
        }),
      ],
    });
    const restored = record(seeded, { kind: "restore", id: "old" }, meta());
    expect(view(restored).readings.map((item) => item._id)).toEqual(["live"]);
    expect(view(restored).clashes).toEqual([
      expect.objectContaining({
        mine: expect.objectContaining({ _id: "old", valueMgDl: 142 }),
        shared: expect.objectContaining({ _id: "live", valueMgDl: 138 }),
      }),
    ]);
  });
});

function clashOverLunch(): {
  device: ReturnType<typeof catchUp>["device"];
  clashId: string;
  shared: LocalLog;
} {
  const lunchAt = at("2026-09-27T13:00:00+02:00");
  const shared: LocalLog = {
    meals: [meal({ _id: "server-lunch", slot: "lunch", anchorAt: lunchAt, note: "pizza" })],
    readings: [
      reading({
        _id: "server-before",
        mealId: "server-lunch",
        valueMgDl: 138,
        context: "before_lunch",
        takenAt: lunchAt,
        userId: OTHER,
        recordedBy: OTHER,
      }),
    ],
  };
  const saved = record(
    open(),
    {
      kind: "save",
      input: {
        valueMgDl: 142,
        context: "before_lunch",
        takenAt: at("2026-09-27T13:02:00+02:00"),
        note: "pâtes",
      },
    },
    meta(),
  );
  const caught = catchUp(saved, shared, TZ);
  return {
    device: caught.device,
    clashId: caught.device.clashes[0]!.id,
    shared,
  };
}
