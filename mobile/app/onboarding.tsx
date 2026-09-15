import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { get, map } from "lodash";

import {
  DIABETES_TYPE_LABELS,
  DIABETES_TYPES,
  t,
  type DiabetesType,
} from "@glowcose/core";
import { Screen } from "@/components/screen";
import { Logo } from "@/components/logo";
import { Disclaimer } from "@/components/disclaimer";
import { Button } from "@/components/ui";
import { useSettings } from "@/providers/settings-provider";
import { colors } from "@/theme";

const BLURBS: Record<DiabetesType, string> = {
  gestational:
    "Cibles France CNGOF/SFD : à jeun ≤ 0,95 g/L, 2h ≤ 1,20, 1h ≤ 1,40.",
  type1:
    "Cibles adultes indicatives (70–180 mg/dL) — à valider avec l’équipe soignante.",
  type2: "Cibles adultes indicatives (préprandial ≤ 130, post ≤ 180 mg/dL).",
  other: "Cibles adultes génériques — vous pourrez les ajuster dans Réglages.",
};

export default function OnboardingRoute() {
  const router = useRouter();
  const { completeOnboarding } = useSettings();
  const [diabetesType, setDiabetesType] =
    useState<DiabetesType>("gestational");

  return (
    <Screen>
      <View style={styles.top}>
        <Logo />
      </View>
      <Text style={styles.title}>Quel diabète suivez-vous ?</Text>
      <Text style={styles.lead}>
        {t("onboarding.lead")}
      </Text>
      <View style={styles.list}>
        {map(DIABETES_TYPES, (type) => (
          <Pressable
            key={type}
            onPress={() => setDiabetesType(type)}
            style={[
              styles.choice,
              diabetesType === type && styles.choiceSelected,
            ]}
          >
            <Text style={styles.choiceTitle}>
              {get(DIABETES_TYPE_LABELS, type)}
            </Text>
            <Text style={styles.choiceBody}>{get(BLURBS, type)}</Text>
          </Pressable>
        ))}
      </View>
      <Button
        title="Continuer"
        onPress={() => {
          completeOnboarding(diabetesType);
          router.replace("/");
        }}
        style={styles.cta}
      />
      <Disclaimer style={styles.disclaimer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    paddingTop: 12,
  },
  title: {
    marginTop: 28,
    fontSize: 30,
    fontWeight: "600",
    color: colors.foreground,
    fontFamily: "Georgia",
  },
  lead: {
    marginTop: 8,
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  list: {
    marginTop: 20,
    gap: 8,
  },
  choice: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  choiceSelected: {
    borderColor: colors.primary,
    backgroundColor: "#E7F3EF",
  },
  choiceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.foreground,
  },
  choiceBody: {
    marginTop: 4,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  cta: {
    marginTop: 24,
  },
  disclaimer: {
    marginTop: 20,
  },
});
