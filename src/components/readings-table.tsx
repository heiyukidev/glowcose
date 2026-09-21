"use client";

import { format } from "date-fns";
import { compact, filter, get, groupBy, keys, map, orderBy, size } from "lodash";
import Link from "next/link";

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
  readingStatus,
  type Reading,
} from "@/lib/glucose";
import { groupReadingsByMeal, type MealSection } from "@/lib/meal";

export function ReadingsList({
  readings,
  emptyTitle,
  emptyBody,
  byMeal = false,
}: {
  readings: Reading[];
  emptyTitle: string;
  emptyBody: string;
  byMeal?: boolean;
}) {
  const { settings } = useSettings();

  if (size(readings) === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center">
        <p className="font-medium">{emptyTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{emptyBody}</p>
      </div>
    );
  }

  if (byMeal) {
    return <MealSections readings={readings} />;
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
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">
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

function MealSections({ readings }: { readings: Reading[] }) {
  const { settings } = useSettings();
  const sections = groupReadingsByMeal(readings);

  return (
    <div className="space-y-5">
      {map(sections, (section) => (
        <section key={section.id} className="space-y-2">
          <MealHeading section={section} />
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
                {map(section.readings, (reading) => {
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
                        {contextLabel(reading.context, reading.postMealOffset)}
                      </TableCell>
                      <TableCell>
                        <Link href={`/mesure/${reading._id}`}>
                          <span className="font-medium">
                            {formatPrimary(reading.valueMgDl, settings.unit)}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
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
      ))}
    </div>
  );
}

function MealHeading({ section }: { section: MealSection }) {
  const urls = compact(map(section.photos, (photo) => photo.url));
  return (
    <div className="px-1">
      <h3 className="text-sm font-medium">{section.label}</h3>
      {section.note ? (
        <p className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">
          {section.note}
        </p>
      ) : null}
      {size(urls) > 0 ? (
        <div className="mt-2 flex gap-2">
          {map(urls, (url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={`Photo du ${section.label}`}
              className="size-16 rounded-lg object-cover"
            />
          ))}
        </div>
      ) : null}
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
