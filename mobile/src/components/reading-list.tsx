import { format } from "date-fns";
import {
  filter,
  get,
  groupBy,
  keys,
  map,
  orderBy,
  size,
} from "lodash";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import {
  contextLabel,
  formatDayHeading,
  formatPrimary,
  formatSecondary,
  formatTime,
  MEAL_SLOT_LABELS,
  momentLabel,
  readingStatus,
  t,
  todayMealCards,
  type Reading,
} from "@glowcose/core";
import { MealCard } from "@/components/meal-card";
import { StatusBadge, StatusDot } from "@/components/status-badge";
import { Button } from "@/components/ui";
import { useSettings } from "@/providers/settings-provider";
import { colors } from "@/theme";

export function todayReadings(readings: Reading[], now = new Date()) {
  const stamp = format(now, "yyyy-MM-dd");
  return filter(
    readings,
    (reading) => format(reading.takenAt, "yyyy-MM-dd") === stamp,
  );
}

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
  emptyAction?: { label: string; onPress: () => void };
  byMeal?: boolean;
  dayKey?: string;
}) {
  const router = useRouter();
  const { settings } = useSettings();

  if (byMeal) {
    return <MealDayCards readings={readings} dayKey={dayKey} />;
  }

  if (size(readings) === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptyBody}>{emptyBody}</Text>
        {emptyAction ? (
          <Button
            title={emptyAction.label}
            onPress={emptyAction.onPress}
            style={styles.emptyAction}
          />
        ) : null}
      </View>
    );
  }

  const grouped = groupBy(readings, (reading) =>
    format(reading.takenAt, "yyyy-MM-dd"),
  );
  const days = orderBy(keys(grouped), [], ["desc"]);

  return (
    <View style={styles.stack}>
      {map(days, (day) => {
        const items = get(grouped, day) ?? [];
        const first = get(items, 0);
        if (!first) return null;
        return (
          <View key={day} style={styles.dayBlock}>
            <Text style={styles.dayHeading}>
              {formatDayHeading(first.takenAt)}
            </Text>
            <View style={styles.card}>
              {map(orderBy(items, ["takenAt"], ["desc"]), (reading) => {
                const status = readingStatus(
                  reading.valueMgDl,
                  reading.context,
                  reading.postMealOffset,
                  settings.thresholds,
                );
                return (
                  <Pressable
                    key={reading._id}
                    onPress={() => router.push(`/mesure/${reading._id}`)}
                    style={styles.row}
                  >
                    <StatusDot status={status} />
                    <View style={styles.rowMain}>
                      <Text style={styles.time}>
                        {formatTime(reading.takenAt)}
                      </Text>
                      <Text style={styles.context}>
                        {contextLabel(reading.context, reading.postMealOffset)}
                      </Text>
                      {reading.note ? (
                        <Text style={styles.note} numberOfLines={1}>
                          {reading.note}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.values}>
                      <Text style={styles.primary}>
                        {formatPrimary(reading.valueMgDl, settings.unit)}
                      </Text>
                      <Text style={styles.secondary}>
                        {formatSecondary(reading.valueMgDl, settings.unit)}
                      </Text>
                      <StatusBadge status={status} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MealDayCards({
  readings,
  dayKey,
}: {
  readings: Reading[];
  dayKey?: string;
}) {
  const router = useRouter();
  const { settings } = useSettings();
  const { meals, extras } = todayMealCards(readings);
  const leftoverNamed = filter(extras, (section) => section.slot !== "other");
  const otherReadings = orderBy(
    filter(readings, (reading) => reading.context === "other"),
    ["takenAt"],
    ["asc"],
  );

  return (
    <View style={styles.stack}>
      {map(meals, (meal) => (
        <MealCard key={meal.id} meal={meal} dayKey={dayKey} />
      ))}
      {map(leftoverNamed, (section) => (
        <View key={section.id} style={styles.meal}>
          <View style={styles.mealHead}>
            <Text style={styles.mealTitle}>{section.label}</Text>
          </View>
          {map(section.readings, (reading, index) => {
            const status = readingStatus(
              reading.valueMgDl,
              reading.context,
              reading.postMealOffset,
              settings.thresholds,
            );
            const isLast = index === size(section.readings) - 1;
            return (
              <Pressable
                key={reading._id}
                onPress={() => router.push(`/mesure/${reading._id}`)}
                style={[styles.row, isLast ? styles.rowLast : null]}
              >
                <StatusDot status={status} />
                <View style={styles.rowMain}>
                  <Text style={styles.time}>
                    {formatTime(reading.takenAt)}
                  </Text>
                  <Text style={styles.context}>
                    {momentLabel(reading.context, reading.postMealOffset)}
                  </Text>
                </View>
                <View style={styles.values}>
                  <Text style={styles.primary}>
                    {formatPrimary(reading.valueMgDl, settings.unit)}
                  </Text>
                  <Text style={styles.secondary}>
                    {formatSecondary(reading.valueMgDl, settings.unit)}
                  </Text>
                  <StatusBadge status={status} />
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={styles.meal}>
        <View style={styles.mealHead}>
          <Text style={styles.mealTitle}>{MEAL_SLOT_LABELS.other}</Text>
        </View>
        {map(otherReadings, (reading, index) => {
          const status = readingStatus(
            reading.valueMgDl,
            reading.context,
            reading.postMealOffset,
            settings.thresholds,
          );
          return (
            <Pressable
              key={reading._id}
              onPress={() => router.push(`/mesure/${reading._id}`)}
              style={styles.row}
            >
              <StatusDot status={status} />
              <View style={styles.rowMain}>
                <Text style={styles.time}>{formatTime(reading.takenAt)}</Text>
                <Text style={styles.context}>
                  {momentLabel(reading.context, reading.postMealOffset)}
                </Text>
              </View>
              <View style={styles.values}>
                <Text style={styles.primary}>
                  {formatPrimary(reading.valueMgDl, settings.unit)}
                </Text>
                <Text style={styles.secondary}>
                  {formatSecondary(reading.valueMgDl, settings.unit)}
                </Text>
                <StatusBadge status={status} />
              </View>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("meal.addOther")}
          onPress={() =>
            router.push({
              pathname: "/ajouter",
              params: dayKey
                ? { context: "other", day: dayKey }
                : { context: "other" },
            })
          }
          style={styles.addOther}
        >
          <Text style={styles.addOtherLabel}>{t("meal.addOther")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 22,
  },
  dayBlock: {
    gap: 8,
  },
  dayHeading: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
    textTransform: "capitalize",
    paddingHorizontal: 4,
  },
  meal: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  mealHead: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  mealTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.foreground,
  },
  mealNote: {
    fontSize: 13,
    color: colors.muted,
  },
  addOther: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addOtherLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  photos: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    alignItems: "flex-start",
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  time: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.foreground,
  },
  context: {
    marginTop: 2,
    fontSize: 13,
    color: colors.foreground,
  },
  note: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  values: {
    alignItems: "flex-end",
    gap: 4,
  },
  primary: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.foreground,
  },
  secondary: {
    fontSize: 11,
    color: colors.muted,
  },
  emptyAction: {
    marginTop: 16,
  },
  empty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 36,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.foreground,
  },
  emptyBody: {
    marginTop: 6,
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
});
