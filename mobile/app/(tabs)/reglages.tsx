import { useEffect, useState } from "react";
import { get, isEqual, map } from "lodash";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  bandFromDraft,
  DIABETES_TYPE_LABELS,
  DIABETES_TYPES,
  t,
  type BandThresholds,
  type ThresholdPreset,
} from "@glowcose/core";
import { Screen } from "@/components/screen";
import { AppHeader } from "@/components/header";
import { Disclaimer } from "@/components/disclaimer";
import { Chip } from "@/components/ui";
import { UnitToggle } from "@/components/unit-toggle";
import { ShareCarnet } from "@/components/share-carnet";
import { useSettings } from "@/providers/settings-provider";
import { colors } from "@/theme";

const BAND_ROWS: Array<{ key: keyof ThresholdPreset; label: string }> = [
  { key: "beforeMeal", label: "Avant repas / à jeun" },
  { key: "after1h", label: "Après repas 1h" },
  { key: "after2h", label: "Après repas 2h" },
  { key: "other", label: "Autre / hors repas" },
];

function draftsFromBand(band: BandThresholds) {
  return {
    hypoBelow: String(band.hypoBelow),
    greenMax: String(band.greenMax),
    orangeMax: String(band.orangeMax),
  };
}

function BandFields({
  band,
  onChange,
}: {
  band: BandThresholds;
  onChange: (next: BandThresholds) => void;
}) {
  const [draft, setDraft] = useState(() => draftsFromBand(band));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setDraft(draftsFromBand(band));
    setInvalid(false);
  }, [band]);

  function commit() {
    const next = bandFromDraft(draft);
    if (!next) {
      setInvalid(true);
      setDraft(draftsFromBand(band));
      return;
    }
    setInvalid(false);
    if (!isEqual(next, band)) onChange(next);
  }

  return (
    <View>
      <View style={styles.bandGrid}>
        <View style={styles.bandCol}>
          <Text style={styles.bandLabel}>Hypo &lt;</Text>
          <TextInput
            keyboardType="numeric"
            maxLength={3}
            value={draft.hypoBelow}
            onChangeText={(value) =>
              setDraft((current) => ({ ...current, hypoBelow: value }))
            }
            onBlur={commit}
            style={styles.input}
          />
        </View>
        <View style={styles.bandCol}>
          <Text style={styles.bandLabel}>Vert ≤</Text>
          <TextInput
            keyboardType="numeric"
            maxLength={3}
            value={draft.greenMax}
            onChangeText={(value) =>
              setDraft((current) => ({ ...current, greenMax: value }))
            }
            onBlur={commit}
            style={styles.input}
          />
        </View>
        <View style={styles.bandCol}>
          <Text style={styles.bandLabel}>Orange ≤</Text>
          <TextInput
            keyboardType="numeric"
            maxLength={3}
            value={draft.orangeMax}
            onChangeText={(value) =>
              setDraft((current) => ({ ...current, orangeMax: value }))
            }
            onBlur={commit}
            style={styles.input}
          />
        </View>
      </View>
      {invalid ? (
        <Text accessibilityRole="alert" style={styles.bandError}>
          {t("settings.bandOrder")}
        </Text>
      ) : null}
    </View>
  );
}

export default function SettingsRoute() {
  const {
    settings,
    setUnit,
    setDiabetesType,
    setThresholds,
    resetThresholds,
  } = useSettings();

  return (
    <Screen>
      <AppHeader />
      <Text style={styles.title}>Réglages</Text>
      <Text style={styles.lead}>
        Unités d’affichage et seuils (mg/dL). Les valeurs restent stockées en
        mg/dL.
      </Text>

      <Text style={styles.section}>Unités</Text>
      <UnitToggle value={settings.unit} onChange={setUnit} />

      <ShareCarnet />

      <Text style={styles.section}>Type de diabète</Text>
      <View style={styles.chips}>
        {map(DIABETES_TYPES, (type) => (
          <Chip
            key={type}
            selected={settings.diabetesType === type}
            label={get(DIABETES_TYPE_LABELS, type)}
            onPress={() => setDiabetesType(type)}
          />
        ))}
      </View>
      <Text style={styles.hint}>
        Changer le type recharge le préréglage de couleurs. Gestationnel =
        CNGOF/SFD.
      </Text>

      <View style={styles.thresholdHead}>
        <Text style={styles.sectionInline}>Seuils (mg/dL)</Text>
        <Pressable onPress={resetThresholds}>
          <Text style={styles.reset}>Rétablir le préréglage</Text>
        </Pressable>
      </View>
      {map(BAND_ROWS, (row) => (
        <View key={row.key} style={styles.card}>
          <Text style={styles.cardTitle}>{row.label}</Text>
          <BandFields
            band={get(settings.thresholds, row.key)}
            onChange={(band) =>
              setThresholds({ ...settings.thresholds, [row.key]: band })
            }
          />
        </View>
      ))}

      <Disclaimer style={styles.disclaimer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 32,
    fontWeight: "600",
    color: colors.foreground,
    fontFamily: "Georgia",
  },
  lead: {
    marginTop: 4,
    marginBottom: 20,
    fontSize: 13,
    color: colors.muted,
  },
  section: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  sectionInline: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  hint: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 12,
    color: colors.muted,
  },
  thresholdHead: {
    marginTop: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reset: {
    fontSize: 12,
    color: colors.muted,
    textDecorationLine: "underline",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  bandGrid: {
    flexDirection: "row",
    gap: 8,
  },
  bandCol: {
    flex: 1,
    minWidth: 0,
  },
  bandLabel: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 4,
  },
  input: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    color: colors.foreground,
    fontSize: 16,
  },
  bandError: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: colors.statusAlert,
  },
  disclaimer: {
    marginTop: 16,
  },
});
