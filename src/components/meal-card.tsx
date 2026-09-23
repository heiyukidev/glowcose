"use client";

import { compact, map, size } from "lodash";
import { Images } from "lucide-react";
import Link from "next/link";

import { useSettings } from "@/components/settings-provider";
import {
  formatInputValue,
  formatTime,
} from "@/lib/format";
import {
  readingStatus,
  UNIT_LABELS,
  type Reading,
  type ReadingStatus,
} from "@/lib/glucose";
import {
  contextForMealSide,
  type MealCardModel,
  type MealCardSide,
} from "@/lib/meal";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STATUS_SURFACE: Record<ReadingStatus, string> = {
  in_range: "bg-[var(--status-in)]/18 text-[var(--status-in-fg)]",
  high: "bg-[var(--status-high)]/20 text-[var(--status-high-fg)]",
  very_high: "bg-[var(--status-alert)]/18 text-[var(--status-alert-fg)]",
  hypo: "bg-[var(--status-low)]/18 text-[var(--status-low-fg)]",
};

/** Idle empty slots stay paper/ink — status green/red only when a value exists. */
const EMPTY_SURFACE =
  "bg-muted/70 text-muted-foreground hover:bg-muted ring-1 ring-foreground/8";


function sideHref(reading: Reading | undefined, context: string) {
  if (reading) return `/mesure/${reading._id}`;
  return `/ajouter?context=${encodeURIComponent(context)}`;
}

function MealSideCell({
  side,
  meal,
  reading,
}: {
  side: MealCardSide;
  meal: MealCardModel;
  reading?: Reading;
}) {
  const { settings } = useSettings();
  const context = contextForMealSide(meal.slot, side);
  const href = sideHref(reading, context);
  const label =
    side === "before" ? t("meal.addBefore") : t("meal.addAfter");

  if (!reading) {
    return (
      <Link
        href={href}
        aria-label={label}
        className={cn(
          "flex min-h-[5.5rem] flex-1 flex-col items-center justify-center rounded-xl px-2 py-3 transition-colors active:translate-y-px",
          EMPTY_SURFACE,
        )}
      >
        <span className="font-display text-3xl leading-none tracking-tight">
          {t("meal.emptyValue")}
        </span>
        <span className="mt-1 text-xs font-medium opacity-80">+</span>
      </Link>
    );
  }

  const status = readingStatus(
    reading.valueMgDl,
    reading.context,
    reading.postMealOffset,
    settings.thresholds,
  );

  return (
    <Link
      href={href}
      aria-label={`${label} · ${formatInputValue(reading.valueMgDl, settings.unit)}`}
      className={cn(
        "flex min-h-[5.5rem] flex-1 flex-col items-center justify-center rounded-xl px-2 py-3 transition-colors active:translate-y-px",
        STATUS_SURFACE[status],
      )}
    >
      <span className="font-display text-3xl leading-none tracking-tight tabular-nums">
        {formatInputValue(reading.valueMgDl, settings.unit)}
      </span>
      <span className="mt-1 text-xs font-medium opacity-80">
        {UNIT_LABELS[settings.unit]}
      </span>
      <span className="mt-1 text-xs font-medium tabular-nums opacity-90">
        {formatTime(reading.takenAt)}
      </span>
    </Link>
  );
}

export function MealCard({ meal }: { meal: MealCardModel }) {
  const urls = compact(map(meal.photos, (photo) => photo.url));

  return (
    <article className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <h3 className="px-4 pt-3.5 pb-2 text-center font-display text-lg font-medium tracking-tight">
        {meal.label}
      </h3>
      <div className="flex items-stretch gap-2 px-3 pb-3">
        <MealSideCell side="before" meal={meal} reading={meal.before} />
        <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-1.5 px-0.5">
          <span className="text-xs font-medium tracking-wide text-muted-foreground">
            {t("meal.photos")}
          </span>
          {size(urls) > 0 ? (
            <div className="relative size-10">
              {map(urls.slice(0, 3), (url, index) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${meal.id}-photo-${index}`}
                  src={url}
                  alt=""
                  className="absolute size-9 rounded-md object-cover ring-1 ring-card"
                  style={{
                    left: index * 3,
                    top: index * 2,
                    zIndex: 3 - index,
                  }}
                />
              ))}
            </div>
          ) : (
            <span
              className="flex size-10 items-center justify-center rounded-md bg-muted/60 text-muted-foreground"
              aria-hidden
            >
              <Images className="size-4" />
            </span>
          )}
        </div>
        <MealSideCell side="after" meal={meal} reading={meal.after} />
      </div>
      {meal.note ? (
        <p className="border-t border-border px-4 py-3 text-sm wrap-break-word whitespace-pre-line text-muted-foreground">
          {meal.note}
        </p>
      ) : null}
    </article>
  );
}
