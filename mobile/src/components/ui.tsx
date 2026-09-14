import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { colors } from "@/theme";

export function Button({
  title,
  onPress,
  disabled,
  variant = "primary",
  style,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "outline" | "ghost";
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.primary,
        variant === "outline" && styles.outline,
        variant === "ghost" && styles.ghost,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === "primary" && styles.primaryLabel,
          variant === "outline" && styles.outlineLabel,
          variant === "ghost" && styles.ghostLabel,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function linkTextStyle(): TextStyle {
  return styles.link;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  outline: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.86,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryLabel: {
    color: colors.primaryForeground,
  },
  outlineLabel: {
    color: colors.foreground,
  },
  ghostLabel: {
    color: colors.muted,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
  },
  chipLabelSelected: {
    color: colors.primaryForeground,
  },
  link: {
    color: colors.primary,
    fontWeight: "600",
  },
});

export type { PressableProps };
