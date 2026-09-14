import { useState } from "react";
import { filter, map, max, min, orderBy, size } from "lodash";
import { StyleSheet, Text, View } from "react-native";

import {
  convertFromMgDl,
  readingStatus,
  type Reading,
} from "@glowcose/core";
import { useSettings } from "@/providers/settings-provider";
import { colors, statusColors } from "@/theme";

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
    value: convertFromMgDl(reading.valueMgDl, settings.unit),
    status: readingStatus(
      reading.valueMgDl,
      reading.context,
      reading.postMealOffset,
      settings.thresholds,
    ),
  }));

  if (size(points) === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Pas encore de mesure sur cette période.
        </Text>
      </View>
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
  const values = map(points, (point) => point.value);
  const maxVal = Math.max(max(values) ?? 1, greenLine, post2h, 1);
  const minVal = Math.min(min(values) ?? 0, 0);

  return (
    <View>
      <View style={styles.chart}>
        <View
          pointerEvents="none"
          style={[
            styles.ref,
            {
              bottom: `${((greenLine - minVal) / (maxVal - minVal || 1)) * 100}%`,
              borderColor: colors.statusIn,
            },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.ref,
            {
              bottom: `${((post2h - minVal) / (maxVal - minVal || 1)) * 100}%`,
              borderColor: colors.statusHigh,
            },
          ]}
        />
        {map(points, (point) => {
          const height =
            ((point.value - minVal) / (maxVal - minVal || 1)) * 100;
          return (
            <View key={point.id} style={styles.col}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.max(height, 4)}%`,
                    backgroundColor: statusColors[point.status].dot,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <Text style={styles.legend}>
        Trait vert : cible à jeun · trait orange : post 2h.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    height: 180,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    backgroundColor: colors.mutedSurface,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 8,
    overflow: "hidden",
  },
  col: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderRadius: 4,
    minHeight: 4,
  },
  ref: {
    position: "absolute",
    left: 8,
    right: 8,
    borderTopWidth: 1,
    borderStyle: "dashed",
    opacity: 0.7,
  },
  legend: {
    marginTop: 10,
    fontSize: 12,
    color: colors.muted,
  },
  empty: {
    height: 160,
    borderRadius: 16,
    backgroundColor: colors.mutedSurface,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
  },
});
