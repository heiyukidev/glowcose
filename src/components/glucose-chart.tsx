"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { filter, map, orderBy, size } from "lodash";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { StatusDot } from "@/components/status-badge";
import { useSettings } from "@/components/settings-provider";
import { formatPrimary, formatTime } from "@/lib/format";
import {
  contextLabel,
  convertFromMgDl,
  readingStatus,
  type GlucoseUnit,
  type Reading,
  type ReadingStatus,
} from "@/lib/glucose";

type ChartPoint = {
  id: string;
  at: number;
  value: number;
  label: string;
  status: ReadingStatus;
  context: string;
  mgDl: number;
};

function TooltipContent({
  active,
  payload,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartPoint }>;
  unit: GlucoseUnit;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">
        {format(point.at, "EEEE d MMM", { locale: fr })} · {formatTime(point.at)}
      </p>
      <p className="mt-1 flex items-center gap-1.5">
        <StatusDot status={point.status} />
        {formatPrimary(point.mgDl, unit)}
      </p>
      <p className="text-muted-foreground">{point.context}</p>
    </div>
  );
}

export function GlucoseChart({
  readings,
  rangeDays,
}: {
  readings: Reading[];
  rangeDays: 7 | 30;
}) {
  const { settings } = useSettings();
  const [now] = useState(() => Date.now());
  const cutoff = now - rangeDays * 24 * 60 * 60 * 1000;
  const inRange = filter(readings, (reading) => reading.takenAt >= cutoff);
  const points = map(orderBy(inRange, ["takenAt"], ["asc"]), (reading) => ({
    id: reading._id,
    at: reading.takenAt,
    mgDl: reading.valueMgDl,
    value: Number(
      convertFromMgDl(reading.valueMgDl, settings.unit).toFixed(
        settings.unit === "mgdl" ? 0 : 2,
      ),
    ),
    label: format(reading.takenAt, "EEE d", { locale: fr }),
    status: readingStatus(
      reading.valueMgDl,
      reading.context,
      reading.postMealOffset,
      settings.thresholds,
    ),
    context: contextLabel(reading.context, reading.postMealOffset),
  }));

  if (size(points) === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl bg-muted/60 text-sm text-muted-foreground">
        Pas encore de mesure sur cette période.
      </div>
    );
  }

  const greenLine = convertFromMgDl(
    settings.thresholds.beforeMeal.greenMax,
    settings.unit,
  );
  const post2h = convertFromMgDl(
    settings.thresholds.after2h.greenMax,
    settings.unit,
  );

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="glowcoseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) =>
              settings.unit === "mgdl"
                ? String(Math.round(value))
                : value.toFixed(1).replace(".", ",")
            }
          />
          <Tooltip
            content={(props) => (
              <TooltipContent
                active={props.active}
                payload={
                  (props.payload as unknown as Array<{ payload: ChartPoint }>) ??
                  undefined
                }
                unit={settings.unit}
              />
            )}
          />
          <ReferenceLine
            y={greenLine}
            stroke="var(--status-in)"
            strokeDasharray="4 4"
            strokeOpacity={0.7}
          />
          <ReferenceLine
            y={post2h}
            stroke="var(--status-high)"
            strokeDasharray="4 4"
            strokeOpacity={0.55}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--primary)"
            strokeWidth={2.4}
            fill="url(#glowcoseFill)"
            dot={{ r: 3, strokeWidth: 0, fill: "var(--primary)" }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
