"use client";

import { map, size } from "lodash";

import { useReadings } from "@/components/readings-provider";
import { useSettings } from "@/components/settings-provider";
import { Button } from "@/components/ui/button";
import { formatPrimary } from "@/lib/format";
import { t } from "@/lib/i18n";

export function CarnetConflicts() {
  const {
    clashes,
    archived,
    chooseClash,
    restoreReading,
    applyRememberedNote,
  } = useReadings();
  const { settings } = useSettings();
  if (size(clashes) === 0 && size(archived) === 0) return null;

  return (
    <div className="space-y-3">
      {map(clashes, (clash) => (
        <section
          key={clash.id}
          className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
        >
          <p className="font-medium">{t("clash.yours")}</p>
          <p className="text-sm text-muted-foreground">
            {formatPrimary(clash.mine.valueMgDl, settings.unit)}
            {" · "}
            {t("clash.shared", {
              value: formatPrimary(clash.shared.valueMgDl, settings.unit),
            })}
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => void chooseClash(clash.id, "keep")}>
              {t("clash.keep")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void chooseClash(clash.id, "drop")}
            >
              {t("clash.drop")}
            </Button>
          </div>
        </section>
      ))}
      {size(archived) > 0 ? (
        <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <h3 className="font-medium">{t("archive.title")}</h3>
          <ul className="mt-2 space-y-3">
            {map(archived, (reading) => {
              const note = reading.note?.trim();
              return (
                <li key={reading._id} className="flex flex-wrap items-center gap-2">
                  <span className="text-sm">
                    {formatPrimary(reading.valueMgDl, settings.unit)}
                    {note ? ` · ${note}` : ""}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void restoreReading(reading._id)}
                  >
                    {t("archive.restore")}
                  </Button>
                  {note && reading.mealId ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void applyRememberedNote(reading.mealId!)}
                    >
                      {t("archive.applyNote")}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
