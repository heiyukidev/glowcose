"use client";

import { format } from "date-fns";
import { filter, get, groupBy, keys, map, orderBy, size } from "lodash";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MealCard } from "@/components/meal-card";
import { StatusBadge, StatusDot } from "@/components/status-badge";
import { useSettings } from "@/components/settings-provider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDayHeading,
  formatPrimary,
  formatSecondary,
  formatTime,
} from "@/lib/format";
import {
  contextLabel,
  momentLabel,
  readingStatus,
  type Reading,
} from "@/lib/glucose";
import { MEAL_SLOT_LABELS, todayMealCards } from "@/lib/meal";
import { ajouterHref } from "@/lib/ajouter-href";
import { t } from "@/lib/i18n";

export function ReadingsList({
  readings,
  emptyTitle,
  emptyBody,
  emptyAction,
  byMeal = false,
  dayKey,
}: {
  readings: Reading[];
  emptyTitle: string;
  emptyBody: string;
  emptyAction?: { href: string; label: string };
  byMeal?: boolean;
  dayKey?: string;
}) {
  const { settings } = useSettings();

  if (byMeal) {
    return <MealDayCards readings={readings} dayKey={dayKey} />;
  }

  if (size(readings) === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center">
        <p className="font-medium text-balance">{emptyTitle}</p>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">{emptyBody}</p>
        {emptyAction ? (
          <Button
            nativeButton={false}
            className="mt-4 h-11 rounded-2xl px-5"
            render={<Link href={emptyAction.href} />}
          >
            {emptyAction.label}
          </Button>
        ) : null}
      </div>
    );
  }

  const grouped = groupBy(readings, (reading) =>
    format(reading.takenAt, "yyyy-MM-dd"),
  );
  const days = orderBy(keys(grouped), [], ["desc"]);

  return (
    <div className="space-y-5">
      {map(days, (day) => {
        const items = get(grouped, day) ?? [];
        const first = get(items, 0);
        if (!first) return null;
        const heading = formatDayHeading(first.takenAt);
        return (
          <section key={day} className="space-y-2">
            <h3 className="px-1 text-sm font-medium capitalize text-muted-foreground">
              {heading}
            </h3>
            <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Heure</TableHead>
                    <TableHead>Contexte</TableHead>
                    <TableHead>Valeur</TableHead>
                    <TableHead className="hidden sm:table-cell">Cible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {map(orderBy(items, ["takenAt"], ["desc"]), (reading) => {
                    const status = readingStatus(
                      reading.valueMgDl,
                      reading.context,
                      reading.postMealOffset,
                      settings.thresholds,
                    );
                    return (
                      <TableRow key={reading._id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/mesure/${reading._id}`}
                            className="inline-flex items-center gap-2 hover:underline"
                          >
                            <StatusDot status={status} />
                            {formatTime(reading.takenAt)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>
                              {contextLabel(
                                reading.context,
                                reading.postMealOffset,
                              )}
                            </span>
                            {reading.note ? (
                              <span className="max-w-[14rem] truncate text-xs text-muted-foreground">
                                {reading.note}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link href={`/mesure/${reading._id}`}>
                            <span className="font-medium">
                              {formatPrimary(reading.valueMgDl, settings.unit)}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {formatSecondary(reading.valueMgDl, settings.unit)}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <StatusBadge status={status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MealDayCards({
  readings,
  dayKey,
}: {
  readings: Reading[];
  dayKey?: string;
}) {
  const { settings } = useSettings();
  const { meals, extras } = todayMealCards(readings);
  const leftoverNamed = filter(extras, (section) => section.slot !== "other");
  const otherReadings = orderBy(
    filter(readings, (reading) => reading.context === "other"),
    ["takenAt"],
    ["asc"],
  );

  return (
    <div className="space-y-5">
      {map(meals, (meal) => (
        <MealCard key={meal.id} meal={meal} dayKey={dayKey} />
      ))}
      {map(leftoverNamed, (section) => (
        <section
          key={section.id}
          className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10"
        >
          <div className="border-b border-border px-4 pt-3.5 pb-3">
            <h3 className="font-display text-lg font-medium tracking-tight">
              {section.label}
            </h3>
          </div>
          <ul>
            {map(section.readings, (reading) => {
              const status = readingStatus(
                reading.valueMgDl,
                reading.context,
                reading.postMealOffset,
                settings.thresholds,
              );
              return (
                <li
                  key={reading._id}
                  className="border-b border-border last:border-b-0"
                >
                  <Link
                    href={`/mesure/${reading._id}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/60"
                  >
                    <StatusDot status={status} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {formatTime(reading.takenAt)}
                      </span>
                      <span className="mt-0.5 block text-sm text-foreground">
                        {momentLabel(reading.context, reading.postMealOffset)}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold">
                        {formatPrimary(reading.valueMgDl, settings.unit)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatSecondary(reading.valueMgDl, settings.unit)}
                      </span>
                      <StatusBadge status={status} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
        <div className="border-b border-border px-4 pt-3.5 pb-3">
          <h3 className="font-display text-lg font-medium tracking-tight">
            {MEAL_SLOT_LABELS.other}
          </h3>
        </div>
        {size(otherReadings) > 0 ? (
          <ul>
            {map(otherReadings, (reading) => {
              const status = readingStatus(
                reading.valueMgDl,
                reading.context,
                reading.postMealOffset,
                settings.thresholds,
              );
              return (
                <li
                  key={reading._id}
                  className="border-b border-border last:border-b-0"
                >
                  <Link
                    href={`/mesure/${reading._id}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/60"
                  >
                    <StatusDot status={status} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {formatTime(reading.takenAt)}
                      </span>
                      <span className="mt-0.5 block text-sm text-foreground">
                        {momentLabel(reading.context, reading.postMealOffset)}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <span className="text-sm font-semibold">
                        {formatPrimary(reading.valueMgDl, settings.unit)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatSecondary(reading.valueMgDl, settings.unit)}
                      </span>
                      <StatusBadge status={status} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
        <Link
          href={ajouterHref({ context: "other", dayKey })}
          className="flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold text-primary hover:bg-muted/60"
        >
          <Plus className="size-4" />
          {t("meal.addOther")}
        </Link>
      </section>
    </div>
  );
}

export function todayReadings(readings: Reading[], now = new Date()) {
  const stamp = format(now, "yyyy-MM-dd");
  return filter(
    readings,
    (reading) => format(reading.takenAt, "yyyy-MM-dd") === stamp,
  );
}
