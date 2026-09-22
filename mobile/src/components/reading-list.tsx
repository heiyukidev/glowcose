import { format } from "date-fns";
import {
  compact,
  filter,
  get,
  groupBy,
  keys,
  last,
  map,
  orderBy,
  size,
} from "lodash";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import {
  contextLabel,
  formatDayHeading,
  formatPrimary,
  formatSecondary,
  formatTime,
  groupReadingsByMeal,
  momentLabel,
  readingStatus,
  type Reading,
} from "@glowcose/core";
import { StatusBadge, StatusDot } from "@/components/status-badge";
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
  byMeal = false,
}: {
  readings: Reading[];
  emptyTitle: string;
  emptyBody: string;
  byMeal?: boolean;
}) {
  const router = useRouter();
  const { settings } = useSettings();

  if (size(readings) === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{emptyTitle}</Text>
        <Text style={styles.emptyBody}>{emptyBody}</Text>
      </View>
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

function MealSections({ readings }: { readings: Reading[] }) {
  const router = useRouter();
  const { settings } = useSettings();
  const sections = groupReadingsByMeal(readings);

  return (
    <View style={styles.stack}>
      {map(sections, (section) => {
        const urls = compact(map(section.photos, (photo) => photo.url));
        const lastId = last(section.readings)?._id;
        return (
          <View key={section.id} style={styles.meal}>
            <View style={styles.mealHead}>
              <Text style={styles.mealTitle}>{section.label}</Text>
              {section.note ? (
                <Text style={styles.mealNote}>{section.note}</Text>
              ) : null}
              {size(urls) > 0 ? (
                <View style={styles.photos}>
                  {map(urls, (url) => (
                    <Image
                      key={url}
                      source={{ uri: url }}
                      style={styles.photo}
                      accessibilityLabel={`Photo du ${section.label}`}
                    />
                  ))}
                </View>
              ) : null}
            </View>
            {map(section.readings, (reading) => {
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
                  style={[
                    styles.row,
                    reading._id === lastId ? styles.rowLast : null,
                  ]}
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
        );
      })}
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
