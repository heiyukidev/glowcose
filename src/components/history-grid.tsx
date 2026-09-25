"use client";

import { map, size } from "lodash";
import Link from "next/link";
import { useState } from "react";

import { useSettings } from "@/components/settings-provider";
import { cn } from "@/lib/utils";
import { formatInputValue } from "../../packages/core/src/format";
import {
  readingStatus,
  type Reading,
  type ReadingStatus,
} from "../../packages/core/src/glucose";
import { t } from "../../packages/core/src/i18n";
import {
  formatHistoryDay,
  historyMealAbbrev,
  historySideAbbrev,
  type HistoryDay,
} from "../../packages/core/src/history";
import {
  MEAL_SLOT_LABELS,
  type DefaultDayMealSlot,
  type MealCardSide,
} from "../../packages/core/src/meal";

const SLOTS: DefaultDayMealSlot[] = ["breakfast", "lunch", "dinner"];
const SIDES: MealCardSide[] = ["before", "after"];

const PILL: Record<ReadingStatus, string> = {
  in_range: "bg-[var(--status-in)]/15 text-[var(--status-in-fg)]",
  high: "bg-[var(--status-high)]/18 text-[var(--status-high-fg)]",
  very_high: "bg-[var(--status-alert)]/15 text-[var(--status-alert-fg)]",
  hypo: "bg-[var(--status-low)]/15 text-[var(--status-low-fg)]",
};

const SIDE_LABEL: Record<MealCardSide, string> = {
  before: "Avant",
  after: "Après",
};

export function HistoryGrid({ days }: { days: HistoryDay[] }) {
  const { settings } = useSettings();

  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <div className="grid grid-cols-[4.25rem_repeat(6,minmax(0,1fr))] items-end gap-x-0.5 px-2 pt-2 pb-1 sm:grid-cols-[5rem_repeat(6,minmax(0,1fr))] sm:gap-x-1 sm:px-3">
        <span />
        {map(SLOTS, (slot) => (
          <span
            key={slot}
            className="col-span-2 text-center text-[0.6875rem] font-medium text-foreground sm:text-[0.875rem]"
          >
            {historyMealAbbrev(slot)}
          </span>
        ))}
        <span />
        {map(SLOTS, (slot) =>
          map(SIDES, (side) => (
            <span
              key={`${slot}-${side}`}
              className="text-center text-[0.6875rem] text-muted-foreground"
            >
              {historySideAbbrev(side)}
            </span>
          )),
        )}
      </div>
      <ul>
        {map(days, (day) => (
          <HistoryDayRow
            key={day.dayKey}
            day={day}
            unit={settings.unit}
            thresholds={settings.thresholds}
          />
        ))}
      </ul>
    </div>
  );
}

function HistoryDayRow({
  day,
  unit,
  thresholds,
}: {
  day: HistoryDay;
  unit: Parameters<typeof formatInputValue>[1];
  thresholds: Parameters<typeof readingStatus>[3];
}) {
  const [open, setOpen] = useState(false);
  const hasExtras = size(day.extras) > 0;
  const date = formatHistoryDay(day.takenAt);

  return (
    <li className="border-t border-border px-2 py-2 sm:px-3">
      <div className="grid grid-cols-[4.25rem_repeat(6,minmax(0,1fr))] items-center gap-x-0.5 sm:grid-cols-[5rem_repeat(6,minmax(0,1fr))] sm:gap-x-1">
        {hasExtras ? (
          <button
            type="button"
            aria-expanded={open}
            aria-label={t(open ? "history.hideOthers" : "history.showOthers")}
            onClick={() => setOpen((value) => !value)}
            className="text-left text-[0.6875rem] font-medium text-muted-foreground sm:text-[0.875rem]"
          >
            {open ? "▾" : "▸"} {date}
          </button>
        ) : (
          <span className="text-[0.6875rem] font-medium text-muted-foreground sm:text-[0.875rem]">
            {date}
          </span>
        )}
        {map(SLOTS, (slot) =>
          map(SIDES, (side) => (
            <HistoryCell
              key={`${day.dayKey}-${slot}-${side}`}
              slot={slot}
              side={side}
              reading={day.slots[slot][side]}
              unit={unit}
              thresholds={thresholds}
            />
          )),
        )}
      </div>
      {open
        ? map(day.extras, (extra) => {
            const status = readingStatus(
              extra.reading.valueMgDl,
              extra.reading.context,
              extra.reading.postMealOffset,
              thresholds,
            );
            return (
              <Link
                key={extra.id}
                href={`/mesure/${extra.reading._id}`}
                className="mt-1 grid grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-x-0.5 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-x-1"
              >
                <span />
                <span
                  className={cn(
                    "w-fit rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium tabular-nums sm:text-[0.875rem]",
                    PILL[status],
                  )}
                >
                  {extra.label} · {formatInputValue(extra.reading.valueMgDl, unit)}
                </span>
              </Link>
            );
          })
        : null}
    </li>
  );
}

function HistoryCell({
  slot,
  side,
  reading,
  unit,
  thresholds,
}: {
  slot: DefaultDayMealSlot;
  side: MealCardSide;
  reading?: Reading;
  unit: Parameters<typeof formatInputValue>[1];
  thresholds: Parameters<typeof readingStatus>[3];
}) {
  const meal = MEAL_SLOT_LABELS[slot];
  const sideLabel = SIDE_LABEL[side];
  if (!reading) {
    return (
      <span
        className="text-center text-[0.6875rem] text-muted-foreground sm:text-[0.875rem]"
        aria-label={t("history.emptyCell", { meal, side: sideLabel })}
      >
        —
      </span>
    );
  }
  const status = readingStatus(
    reading.valueMgDl,
    reading.context,
    reading.postMealOffset,
    thresholds,
  );
  return (
    <Link
      href={`/mesure/${reading._id}`}
      aria-label={t("history.cell", { meal, side: sideLabel })}
      className={cn(
        "rounded-md px-0.5 py-0.5 text-center text-[0.6875rem] font-medium tabular-nums sm:text-[0.875rem]",
        PILL[status],
      )}
    >
      {formatInputValue(reading.valueMgDl, unit)}
    </Link>
  );
}
