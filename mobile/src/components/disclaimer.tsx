import { StyleSheet, Text, type TextProps } from "react-native";

import { t } from "@glowcose/core";
import { colors } from "@/theme";

export function Disclaimer({ style, ...rest }: TextProps) {
  return (
    <Text style={[styles.text, style]} {...rest}>
      {t("brand.disclaimer")}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: colors.muted,
  },
});
