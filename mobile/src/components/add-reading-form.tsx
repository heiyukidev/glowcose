import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { addDays, addMinutes } from "date-fns";
import { get, map } from "lodash";
import { Camera } from "lucide-react-native";

import {
  CONTEXTS,
  CONTEXT_LABELS,
  defaultContextForTime,
  effectiveOffset,
  formatDayHeading,
  formatInputValue,
  formatPrimary,
  formatSecondary,
  formatTime,
  isAfterContext,
  mgDlToGl,
  parseGlucoseInput,
  readingStatus,
  t,
  thresholdsForContext,
  unitPlaceholder,
  type PostMealOffset,
  type Reading,
  type ReadingContext,
} from "@glowcose/core";
import { Chip, Button } from "@/components/ui";
import { StatusBadge } from "@/components/status-badge";
import { UnitToggle } from "@/components/unit-toggle";
import { useReadings } from "@/providers/readings-provider";
import { useSettings } from "@/providers/settings-provider";
import { colors, statusColors } from "@/theme";

const TONE_BG = {
  empty: colors.card,
  in_range: statusColors.in_range.bg,
  high: statusColors.high.bg,
  very_high: statusColors.very_high.bg,
  hypo: statusColors.hypo.bg,
} as const;

export function AddReadingForm({ initial }: { initial?: Reading }) {
  const router = useRouter();
  const { addReading, updateReading, archiveReading } = useReadings();
  const { settings, setUnit } = useSettings();
  const now = useMemo(() => new Date(), []);
  const [rawValue, setRawValue] = useState(() =>
    initial ? formatInputValue(initial.valueMgDl, settings.unit) : "",
  );
  const [context, setContext] = useState<ReadingContext>(
    () => initial?.context ?? defaultContextForTime(now),
  );
  const [postMealOffset, setPostMealOffset] = useState<PostMealOffset>(
    () => initial?.postMealOffset ?? 2,
  );
  const [takenAt, setTakenAt] = useState(
    () => initial?.takenAt ?? now.getTime(),
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(
    initial?.photoUrl,
  );
  const [saving, setSaving] = useState(false);

  const parsedMgDl = parseGlucoseInput(rawValue, settings.unit);
  const offset = isAfterContext(context) ? postMealOffset : undefined;
  const status =
    parsedMgDl === null
      ? null
      : readingStatus(parsedMgDl, context, offset, settings.thresholds);
  const band = thresholdsForContext(context, offset, settings.thresholds);

  async function onPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo",
        "Autorisez l’accès aux photos pour joindre un repas (stub local).",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
    });
    if (!result.canceled) {
      setPhotoUrl(result.assets[0]?.uri);
    }
  }

  async function onSubmit() {
    if (parsedMgDl === null) {
      Alert.alert("Glycémie", t("form.invalidReading"));
      return;
    }
    setSaving(true);
    const payload = {
      valueMgDl: parsedMgDl,
      context,
      postMealOffset: effectiveOffset(context, postMealOffset),
      note: note.trim() || undefined,
      photoUrl,
      takenAt,
    };
    try {
      if (initial) {
        await updateReading(initial._id, payload);
      } else {
        await addReading(payload);
      }
      router.replace("/");
    } catch {
      Alert.alert("Enregistrement", t("form.saveUnavailable"));
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <View
        style={[
          styles.valueCard,
          { backgroundColor: get(TONE_BG, status ?? "empty") },
        ]}
      >
        <View style={styles.center}>
          <UnitToggle value={settings.unit} onChange={setUnit} />
        </View>
        <TextInput
          value={rawValue}
          onChangeText={setRawValue}
          placeholder={unitPlaceholder(settings.unit)}
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          autoFocus={!initial}
          style={styles.valueInput}
        />
        {parsedMgDl !== null ? (
          <Text style={styles.secondary}>
            {formatSecondary(parsedMgDl, settings.unit)}
          </Text>
        ) : (
          <Text style={styles.secondary}>
            Unité d’affichage :{" "}
            {settings.unit === "gL"
              ? "g/L"
              : settings.unit === "mmol"
                ? "mmol/L"
                : "mg/dL"}
          </Text>
        )}
        <View style={styles.statusBlock}>
          {status ? <StatusBadge status={status} /> : null}
          <Text style={styles.secondary}>
            Cible verte ≤ {formatPrimary(band.greenMax, settings.unit)} · orange
            jusqu’à {formatPrimary(band.orangeMax, settings.unit)}
          </Text>
        </View>
      </View>

      <Text style={styles.section}>Contexte</Text>
      <View style={styles.chips}>
        {map(CONTEXTS, (item) => (
          <Chip
            key={item}
            selected={context === item}
            label={get(CONTEXT_LABELS, item)}
            onPress={() => setContext(item)}
          />
        ))}
      </View>
      {isAfterContext(context) ? (
        <View style={styles.chips}>
          <Chip
            selected={postMealOffset === 1}
            label="1h après"
            onPress={() => setPostMealOffset(1)}
          />
          <Chip
            selected={postMealOffset === 2}
            label="2h après"
            onPress={() => setPostMealOffset(2)}
          />
        </View>
      ) : (
        <Text style={styles.hint}>
          Avant repas / autre : cible à jeun (vert jusqu’à{" "}
          {mgDlToGl(band.greenMax).toFixed(2).replace(".", ",")} g/L).
        </Text>
      )}

      <Text style={styles.section}>Heure</Text>
      <Text style={styles.timeLabel}>
        {formatDayHeading(takenAt)} · {formatTime(takenAt)}
      </Text>
      <View style={styles.chips}>
        <Chip
          label="−15 min"
          selected={false}
          onPress={() => setTakenAt(addMinutes(takenAt, -15).getTime())}
        />
        <Chip
          label="Maintenant"
          selected={false}
          onPress={() => setTakenAt(Date.now())}
        />
        <Chip
          label="+15 min"
          selected={false}
          onPress={() => setTakenAt(addMinutes(takenAt, 15).getTime())}
        />
        <Chip
          label="Jour −1"
          selected={false}
          onPress={() => setTakenAt(addDays(takenAt, -1).getTime())}
        />
      </View>

      <Text style={styles.section}>Note</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Repas, marche, stress…"
        placeholderTextColor={colors.muted}
        multiline
        style={styles.note}
      />

      <Text style={styles.section}>Photo du repas</Text>
      <Pressable onPress={() => void onPhoto()} style={styles.photo}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photoImage} />
        ) : (
          <Camera color={colors.muted} size={22} />
        )}
        <Text style={styles.hint}>
          {photoUrl
            ? "Photo ajoutée (stockage local, stub)"
            : "Ajouter une photo — stub local, R2 plus tard"}
        </Text>
      </Pressable>

      <Button
        title={saving ? "Enregistrement…" : "Enregistrer"}
        disabled={saving || parsedMgDl === null}
        onPress={() => void onSubmit()}
      />
      {initial ? (
        <Button
        title={t("form.archive")}
          variant="ghost"
          onPress={() => {
            Alert.alert(t("form.archive"), t("form.archivePrompt"), [
              { text: t("form.cancel"), style: "cancel" },
              {
                text: t("form.archive"),
                style: "destructive",
                onPress: () => {
                  void archiveReading(initial._id).then(() =>
                    router.replace("/"),
                  );
                },
              },
            ]);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
    paddingBottom: 32,
  },
  valueCard: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  center: {
    alignItems: "center",
    marginBottom: 8,
  },
  valueInput: {
    minHeight: 72,
    width: "100%",
    textAlign: "center",
    fontSize: 52,
    fontWeight: "600",
    color: colors.foreground,
    fontFamily: "Georgia",
  },
  secondary: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  statusBlock: {
    marginTop: 12,
    alignItems: "center",
    gap: 8,
  },
  section: {
    marginTop: 8,
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
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  timeLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.foreground,
    textTransform: "capitalize",
  },
  note: {
    minHeight: 80,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
    color: colors.foreground,
    fontSize: 15,
  },
  photo: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  photoImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
  },
});
