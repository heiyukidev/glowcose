"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { compact, filter, groupBy, keys, map, orderBy, size, sortBy } from "lodash";
import { useCallback, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import { StatusDot } from "@/components/status-badge";
import { useSettings } from "@/components/settings-provider";
import { formatPrimary, formatTime } from "@/lib/format";
import { t } from "@/lib/i18n";
import {
  contextLabel,
  convertFromMgDl,
  readingStatus,
  type Reading,
  type ReadingStatus,
} from "@/lib/glucose";

type ChartPoint = {
  id: string;
  at: number;
  value: number;
  status: ReadingStatus;
  context: string;
  mgDl: number;
};

function dayTicks(points: ChartPoint[]): number[] {
  const pointsByDay = groupBy(points, (point) => format(point.at, "yyyy-MM-dd"));
  return compact(
    map(sortBy(keys(pointsByDay)), (day) => pointsByDay[day]?.[0]?.at),
  );
}

const TIME_DOMAIN: ["dataMin", "dataMax"] = ["dataMin", "dataMax"];
const AXIS_TICK = { fontSize: 11, fill: "var(--muted-foreground)" };
const CHART_MARGIN = { top: 8, right: 8, left: -12, bottom: 0 };
const AREA_DOT = { r: 3, strokeWidth: 0, fill: "var(--primary)" };
const ACTIVE_DOT = { r: 5 };

function formatDayTick(value: number): string {
  return format(value, "EEE d", { locale: fr });
}

function isChartPoint(value: unknown): value is ChartPoint {
  if (typeof value !== "object" || value === null) return false;
  return (
    "at" in value &&
    "mgDl" in value &&
    "status" in value &&
    "context" in value
  );
}

function TooltipContent({ active, payload }: TooltipContentProps) {
  const { settings } = useSettings();
  const point = payload?.[0]?.payload;
  if (!active || !isChartPoint(point)) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">
        {format(point.at, "EEEE d MMM", { locale: fr })} · {formatTime(point.at)}
      </p>
      <p className="mt-1 flex items-center gap-1.5">
        <StatusDot status={point.status} />
        {formatPrimary(point.mgDl, settings.unit)}
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
  const points = useMemo(() => {
    const cutoff = now - rangeDays * 24 * 60 * 60 * 1000;
    const inRange = filter(readings, (reading) => reading.takenAt >= cutoff);
    return map(orderBy(inRange, ["takenAt"], ["asc"]), (reading) => ({
      id: reading._id,
      at: reading.takenAt,
      mgDl: reading.valueMgDl,
      value: Number(
        convertFromMgDl(reading.valueMgDl, settings.unit).toFixed(
          settings.unit === "mgdl" ? 0 : 2,
        ),
      ),
      status: readingStatus(
        reading.valueMgDl,
        reading.context,
        reading.postMealOffset,
        settings.thresholds,
      ),
      context: contextLabel(reading.context, reading.postMealOffset),
    }));
  }, [now, rangeDays, readings, settings]);
  const ticks = useMemo(() => dayTicks(points), [points]);
  const formatValueTick = useCallback(
    (value: number) =>
      settings.unit === "mgdl"
        ? String(Math.round(value))
        : value.toFixed(1).replace(".", ","),
    [settings.unit],
  );

  if (size(points) === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl bg-muted/60 text-sm text-muted-foreground">
        {t("graph.empty")}
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
        <AreaChart data={points} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="glucielFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="at"
            type="number"
            domain={TIME_DOMAIN}
            ticks={ticks}
            tickFormatter={formatDayTick}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatValueTick}
          />
          <Tooltip content={TooltipContent} />
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
            fill="url(#glucielFill)"
            dot={AREA_DOT}
            activeDot={ACTIVE_DOT}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
