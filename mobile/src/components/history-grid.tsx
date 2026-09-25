import { map } from "lodash";
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
        <View key={day.dayKey} style={styles.day}>
          <View style={styles.row}>
            <Text style={styles.date}>{formatHistoryDay(day.takenAt)}</Text>
            {map(SLOTS, (slot) =>
              map(SIDES, (side) => (
                <HistoryCell
                  key={`${day.dayKey}-${slot}-${side}`}
                  slot={slot}
                  side={side}
                  reading={day.slots[slot][side]}
                  unit={settings.unit}
                  thresholds={settings.thresholds}
                />
              )),
            )}
          </View>
          {map(day.extras, (extra) => {
            const status = readingStatus(
              extra.reading.valueMgDl,
              extra.reading.context,
              extra.reading.postMealOffset,
              settings.thresholds,
            );
            return (
              <ExtraLine
                key={extra.id}
                id={extra.reading._id}
                label={`${extra.label} · ${formatInputValue(extra.reading.valueMgDl, settings.unit)}`}
                status={status}
              />
            );
          })}
        </View>
      ))}
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
    width: 52,
  },
  date: {
    width: 52,
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
    paddingLeft: 52,
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
