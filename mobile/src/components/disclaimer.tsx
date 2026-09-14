import { StyleSheet, Text, type TextProps } from "react-native";

import { colors } from "@/theme";

export function Disclaimer({ style, ...rest }: TextProps) {
  return (
    <Text style={[styles.text, style]} {...rest}>
      Glowcose n’est pas un dispositif médical et ne remplace pas un avis
      médical.
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
