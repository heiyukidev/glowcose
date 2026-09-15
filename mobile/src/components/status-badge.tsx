import { StyleSheet, Text, View } from "react-native";
import { get } from "lodash";

import { statusLabel, type ReadingStatus } from "@glowcose/core";
import { statusColors } from "@/theme";

export function StatusBadge({ status }: { status: ReadingStatus }) {
  const tone = get(statusColors, status);
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={[styles.label, { color: tone.fg }]}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

export function StatusDot({ status }: { status: ReadingStatus }) {
  const tone = get(statusColors, status);
  return <View style={[styles.dot, { backgroundColor: tone.dot }]} />;
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
