import { useState } from "react";
import { map, size } from "lodash";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import {
  formatHistoryDay,
  formatInputValue,
  historyMealAbbrev,
  historySideAbbrev,
  MEAL_SLOT_LABELS,
  readingStatus,
  t,
  type DefaultDayMealSlot,
  type GlucoseUnit,
  type HistoryDay,
  type MealCardSide,
  type Reading,
  type ReadingStatus,
  type ThresholdPreset,
} from "@glowcose/core";
import { useSettings } from "@/providers/settings-provider";
import { colors, statusColors } from "@/theme";

const SLOTS: DefaultDayMealSlot[] = ["breakfast", "lunch", "dinner"];
const SIDES: MealCardSide[] = ["before", "after"];

const SIDE_LABEL: Record<MealCardSide, string> = {
  before: "Avant",
  after: "Après",
};

const PILL: Record<ReadingStatus, { backgroundColor: string; color: string }> = {
  in_range: {
    backgroundColor: statusColors.in_range.bg,
    color: statusColors.in_range.fg,
  },
  high: {
    backgroundColor: statusColors.high.bg,
    color: statusColors.high.fg,
  },
  very_high: {
    backgroundColor: statusColors.very_high.bg,
    color: statusColors.very_high.fg,
  },
  hypo: {
    backgroundColor: statusColors.hypo.bg,
    color: statusColors.hypo.fg,
  },
};

export function HistoryGrid({ days }: { days: HistoryDay[] }) {
  const { settings } = useSettings();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.row}>
          <View style={styles.dateCol} />
          {map(SLOTS, (slot) => (
            <Text key={slot} style={styles.meal}>
              {historyMealAbbrev(slot)}
            </Text>
          ))}
        </View>
        <View style={styles.row}>
          <View style={styles.dateCol} />
          {map(SLOTS, (slot) =>
            map(SIDES, (side) => (
              <Text key={`${slot}-${side}`} style={styles.side}>
                {historySideAbbrev(side)}
              </Text>
            )),
          )}
        </View>
      </View>
      {map(days, (day) => (
        <HistoryDayRow
          key={day.dayKey}
          day={day}
          unit={settings.unit}
          thresholds={settings.thresholds}
        />
      ))}
    </View>
  );
}

function HistoryDayRow({
  day,
  unit,
  thresholds,
}: {
  day: HistoryDay;
  unit: GlucoseUnit;
  thresholds: ThresholdPreset;
}) {
  const [open, setOpen] = useState(false);
  const hasExtras = size(day.extras) > 0;
  const date = formatHistoryDay(day.takenAt);

  return (
    <View style={styles.day}>
      <View style={styles.row}>
        {hasExtras ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={t(open ? "history.hideOthers" : "history.showOthers")}
            onPress={() => setOpen((value) => !value)}
            style={styles.dateCol}
          >
            <Text style={styles.date}>
              {open ? "▾" : "▸"} {date}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.date}>{date}</Text>
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
      </View>
      {open
        ? map(day.extras, (extra) => {
            const status = readingStatus(
              extra.reading.valueMgDl,
              extra.reading.context,
              extra.reading.postMealOffset,
              thresholds,
            );
            return (
              <ExtraLine
                key={extra.id}
                id={extra.reading._id}
                label={`${extra.label} · ${formatInputValue(extra.reading.valueMgDl, unit)}`}
                status={status}
              />
            );
          })
        : null}
    </View>
  );
}

function ExtraLine({
  id,
  label,
  status,
}: {
  id: string;
  label: string;
  status: ReadingStatus;
}) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/mesure/${id}`)}
      style={styles.extraRow}
    >
      <Text style={[styles.extra, PILL[status]]}>{label}</Text>
    </Pressable>
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
  unit: GlucoseUnit;
  thresholds: ThresholdPreset;
}) {
  const router = useRouter();
  const meal = MEAL_SLOT_LABELS[slot];
  const sideLabel = SIDE_LABEL[side];
  if (!reading) {
    return (
      <Text
        style={styles.empty}
        accessibilityLabel={t("history.emptyCell", { meal, side: sideLabel })}
      >
        —
      </Text>
    );
  }
  const status = readingStatus(
    reading.valueMgDl,
    reading.context,
    reading.postMealOffset,
    thresholds,
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("history.cell", { meal, side: sideLabel })}
      onPress={() => router.push(`/mesure/${reading._id}`)}
      style={[styles.pill, { backgroundColor: PILL[status].backgroundColor }]}
    >
      <Text
        style={[styles.pillText, { color: PILL[status].color }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatInputValue(reading.valueMgDl, unit)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  header: {
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 6,
    gap: 2,
  },
  day: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  dateCol: {
    width: 68,
  },
  date: {
    width: 68,
    fontSize: 11,
    fontWeight: "500",
    color: colors.muted,
  },
  meal: {
    flex: 2,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "500",
    color: colors.foreground,
  },
  side: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    color: colors.muted,
  },
  pill: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 1,
    alignItems: "center",
  },
  pillText: {
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  empty: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    color: colors.muted,
  },
  extraRow: {
    paddingLeft: 68,
  },
  extra: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 11,
    fontWeight: "600",
  },
});
