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
import { compact, filter, get, map, size, take, trim } from "lodash";
import { Camera, Images } from "lucide-react-native";

import {
  clampNote,
  CONTEXTS,
  CONTEXT_LABELS,
  defaultContextForTime,
  glucoseInputBounds,
  MAX_NOTE_LENGTH,
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
  MAX_MEAL_PHOTOS,
  formMealKey,
  mealMediaForForm,
  photosAfterMealChange,
  photosFromLegacy,
  resolveUploadedMealPhotos,
} from "@glowcose/core";
import { Chip, Button } from "@/components/ui";
import {
  PhotoViewer,
  useMealPhotoViewer,
} from "@/components/photo-viewer";
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

export function AddReadingForm({
  initial,
  presetContext,
}: {
  initial?: Reading;
  presetContext?: ReadingContext;
}) {
  const router = useRouter();
  const photosViewer = useMealPhotoViewer();
  const { addReading, updateReading, archiveReading, uploadPhoto, readings } =
    useReadings();
  const { settings, setUnit } = useSettings();
  const now = useMemo(() => new Date(), []);
  const defaultTakenAt = initial?.takenAt ?? now.getTime();
  const defaultContext =
    initial?.context ?? presetContext ?? defaultContextForTime(now);
  const [rawValue, setRawValue] = useState(() =>
    initial ? formatInputValue(initial.valueMgDl, settings.unit) : "",
  );
  const [context, setContext] = useState<ReadingContext>(defaultContext);
  const [postMealOffset, setPostMealOffset] = useState<PostMealOffset>(
    () => initial?.postMealOffset ?? 2,
  );
  const [takenAt, setTakenAt] = useState(defaultTakenAt);
  const openingMedia = initial
    ? { note: initial.note ?? "", photos: photosFromLegacy(initial) }
    : mealMediaForForm(readings, defaultContext, defaultTakenAt);
  const [note, setNote] = useState(openingMedia.note ?? "");
  const [photos, setPhotos] = useState<
    {
      url: string;
      storageId?: string;
      localUri?: string;
      mimeType?: string;
    }[]
  >(() =>
    map(openingMedia.photos, (photo) => ({
      url: photo.url ?? "",
      storageId: photo.storageId,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const mealKey = formMealKey(readings, context, takenAt, initial);
  const [attachedMealKey, setAttachedMealKey] = useState(mealKey);
  if (attachedMealKey !== mealKey) {
    setAttachedMealKey(mealKey);
    if (context === "other" && initial?.context === "other") {
      setNote(initial.note ?? "");
      setPhotos((current) =>
        photosAfterMealChange(
          current,
          map(photosFromLegacy(initial), (photo) => ({
            url: photo.url ?? "",
            storageId: photo.storageId,
          })),
        ),
      );
    } else {
      const media = mealMediaForForm(readings, context, takenAt);
      setNote(media.note ?? "");
      setPhotos((current) =>
        photosAfterMealChange(
          current,
          map(media.photos, (photo) => ({
            url: photo.url ?? "",
            storageId: photo.storageId,
          })),
        ),
      );
    }
  }

  const parsedMgDl = parseGlucoseInput(rawValue, settings.unit);
  const offset = isAfterContext(context) ? postMealOffset : undefined;
  const status =
    parsedMgDl === null
      ? null
      : readingStatus(parsedMgDl, context, offset, settings.thresholds);
  const band = thresholdsForContext(context, offset, settings.thresholds);

  async function appendAssets(
    assets: { uri?: string; mimeType?: string }[] | undefined,
  ) {
    const remaining = MAX_MEAL_PHOTOS - size(photos);
    const selected = take(assets ?? [], remaining);
    const next = compact(
      map(selected, (asset) =>
        asset.uri
          ? {
              url: asset.uri,
              localUri: asset.uri,
              mimeType: asset.mimeType,
              storageId: undefined,
            }
          : undefined,
      ),
    );
    setPhotos((current) => [...current, ...next]);
  }

  async function onCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo",
        "Autorisez l’appareil photo pour photographier un repas.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.6,
    });
    if (!result.canceled) {
      await appendAssets(result.assets);
    }
  }

  async function onGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo",
        "Autorisez l’accès aux photos pour joindre un repas.",
      );
      return;
    }
    const remaining = MAX_MEAL_PHOTOS - size(photos);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
    });
    if (!result.canceled) {
      await appendAssets(result.assets);
    }
  }

  function onClearPhoto(index: number) {
    setPhotos((current) =>
      filter(current, (_photo, photoIndex) => photoIndex !== index),
    );
  }

  const bounds = glucoseInputBounds(settings.unit);
  const invalidReading = trim(rawValue) !== "" && parsedMgDl === null;

  async function onArchive() {
    if (!initial || archiving || saving) return;
    setArchiving(true);
    try {
      await archiveReading(initial._id);
      router.replace("/");
    } catch {
      Alert.alert(t("form.archive"), t("form.saveUnavailable"));
      setArchiving(false);
    }
  }

  async function onSubmit() {
    if (saving || archiving) return;
    if (parsedMgDl === null) {
      Alert.alert("Glycémie", t("form.invalidReading", bounds));
      return;
    }
    setSaving(true);
    try {
      const nextPhotos = await resolveUploadedMealPhotos(photos, async (photo) => {
        if (photo.localUri && !photo.storageId) {
          if (uploadPhoto) {
            const storageId = await uploadPhoto({
              uri: photo.localUri,
              mimeType: photo.mimeType,
            });
            return { storageId };
          }
          return { url: photo.localUri };
        }
        return {
          ...(photo.storageId ? { storageId: photo.storageId } : {}),
          ...(photo.url ? { url: photo.url } : {}),
        };
      });
      const payload = {
        valueMgDl: parsedMgDl,
        context,
        postMealOffset: effectiveOffset(context, postMealOffset),
        note: clampNote(note),
        takenAt,
        photos: nextPhotos,
      };
      if (initial) {
        await updateReading(initial._id, payload);
      } else {
        await addReading(payload);
      }
      router.replace("/");
    } catch {
      Alert.alert(t("form.save"), t("form.saveUnavailable"));
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
          maxLength={8}
          autoComplete="off"
          accessibilityLabel="Glycémie"
          style={styles.valueInput}
        />
        {invalidReading ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {t("form.invalidReading", bounds)}
          </Text>
        ) : null}
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
        placeholder="Ce qui a été mangé…"
        placeholderTextColor={colors.muted}
        multiline
        maxLength={MAX_NOTE_LENGTH}
        style={styles.note}
      />
      {size(note) > MAX_NOTE_LENGTH - 80 ? (
        <Text style={styles.hint}>
          {t("form.noteCount", { count: size(note), max: MAX_NOTE_LENGTH })}
        </Text>
      ) : null}

      <Text style={styles.section}>Photos du repas</Text>
      {map(photos, (photo, index) => (
        <View key={`${photo.url}-${index}`} style={styles.photo}>
          {photo.url ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("photo.open")}
              onPress={() => {
                const urls = compact(map(photos, (item) => item.url));
                const startIndex = size(
                  compact(map(take(photos, index), (item) => item.url)),
                );
                photosViewer.show(urls, startIndex);
              }}
            >
              <Image source={{ uri: photo.url }} style={styles.photoImage} />
            </Pressable>
          ) : null}
          <Button
            title="Retirer"
            variant="ghost"
            onPress={() => onClearPhoto(index)}
          />
        </View>
      ))}
      {size(photos) < MAX_MEAL_PHOTOS ? (
        <View style={styles.chips}>
          <Pressable onPress={() => void onCamera()} style={styles.photoPick}>
            <Camera color={colors.muted} size={22} />
            <Text style={styles.hint}>Appareil photo</Text>
          </Pressable>
          <Pressable onPress={() => void onGallery()} style={styles.photoPick}>
            <Images color={colors.muted} size={22} />
            <Text style={styles.hint}>Galerie</Text>
          </Pressable>
        </View>
      ) : null}

      <Button
        title={saving ? t("form.saving") : t("form.save")}
        disabled={saving || archiving || parsedMgDl === null}
        onPress={() => void onSubmit()}
      />
      {initial ? (
        <Button
          title={archiving ? t("form.archiving") : t("form.archive")}
          variant="ghost"
          disabled={saving || archiving}
          onPress={() => {
            Alert.alert(t("form.archive"), t("form.archivePrompt"), [
              { text: t("form.cancel"), style: "cancel" },
              {
                text: t("form.archive"),
                style: "destructive",
                onPress: () => {
                  void onArchive();
                },
              },
            ]);
          }}
        />
      ) : null}
      <PhotoViewer
        open={photosViewer.open}
        onClose={photosViewer.close}
        onStep={photosViewer.step}
      />
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
  error: {
    marginTop: 8,
    fontSize: 13,
    color: colors.statusAlert,
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
  photoPick: {
    flex: 1,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
});
