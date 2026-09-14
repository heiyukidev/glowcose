import { map } from "lodash";
import { StyleSheet, View } from "react-native";

import { UNIT_LABELS, type GlucoseUnit } from "@glowcose/core";
import { Chip } from "@/components/ui";

const UNITS: GlucoseUnit[] = ["gL", "mgdl", "mmol"];

export function UnitToggle({
  value,
  onChange,
}: {
  value: GlucoseUnit;
  onChange: (unit: GlucoseUnit) => void;
}) {
  return (
    <View style={styles.row}>
      {map(UNITS, (unit) => (
        <Chip
          key={unit}
          label={UNIT_LABELS[unit]}
          selected={value === unit}
          onPress={() => onChange(unit)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
});
