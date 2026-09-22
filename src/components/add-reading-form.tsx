"use client";

import { Camera, Check, Images } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { toast } from "sonner";
import { filter, get, map, size, take, trim } from "lodash";

import { Chip } from "@/components/chip";
import { useReadings } from "@/components/readings-provider";
import { useSettings } from "@/components/settings-provider";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UnitToggle } from "@/components/unit-toggle";
import {
  formatInputValue,
  formatPrimary,
  formatSecondary,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
  unitPlaceholder,
} from "@/lib/format";
import {
  CONTEXTS,
  CONTEXT_LABELS,
  defaultContextForTime,
  effectiveOffset,
  isAfterContext,
  clampNote,
  glucoseInputBounds,
  MAX_NOTE_LENGTH,
  mgDlToGl,
  parseGlucoseInput,
  readingStatus,
  thresholdsForContext,
  type PostMealOffset,
  type Reading,
  type ReadingContext,
} from "@/lib/glucose";
import {
  MAX_MEAL_PHOTOS,
  formMealKey,
  mealMediaForForm,
  photosFromLegacy,
} from "@/lib/meal";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TONE_SURFACE: Record<string, string> = {
  empty: "bg-card ring-foreground/10",
  in_range: "bg-[var(--status-in)]/10 ring-[var(--status-in)]/40",
  high: "bg-[var(--status-high)]/12 ring-[var(--status-high)]/45",
  very_high: "bg-[var(--status-alert)]/10 ring-[var(--status-alert)]/40",
  hypo: "bg-[var(--status-low)]/10 ring-[var(--status-low)]/40",
};

async function fileToJpegBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 480;
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas indisponible");
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas indisponible"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      0.62,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Lecture impossible"));
    };
    reader.onerror = () => reject(new Error("Lecture impossible"));
    reader.readAsDataURL(blob);
  });
}

function clientFlagSubscribe() {
  return () => {};
}

type FormPhoto = {
  url: string;
  blob?: Blob;
  storageId?: string;
};

export function AddReadingForm({ initial }: { initial?: Reading }) {
  const router = useRouter();
  const { addReading, updateReading, archiveReading, uploadPhoto, readings } =
    useReadings();
  const { settings, setUnit } = useSettings();
  const now = useMemo(() => new Date(), []);
  const defaultTakenAt = initial?.takenAt ?? now.getTime();
  const defaultContext = initial?.context ?? defaultContextForTime(now);
  const [rawValue, setRawValue] = useState(() =>
    initial ? formatInputValue(initial.valueMgDl, settings.unit) : "",
  );
  const [context, setContext] = useState<ReadingContext>(defaultContext);
  const [postMealOffset, setPostMealOffset] = useState<PostMealOffset>(
    () => initial?.postMealOffset ?? 2,
  );
  const [takenAt, setTakenAt] = useState(() =>
    toDatetimeLocalValue(defaultTakenAt),
  );
  const openingMedia = initial
    ? {
        note: initial.note ?? "",
        photos: photosFromLegacy(initial),
      }
    : mealMediaForForm(readings, defaultContext, defaultTakenAt);
  const [note, setNote] = useState(openingMedia.note ?? "");
  const [photos, setPhotos] = useState<FormPhoto[]>(() =>
    map(openingMedia.photos, (photo) => ({
      url: photo.url ?? "",
      storageId: photo.storageId,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const takenAtMs = fromDatetimeLocalValue(takenAt);
  const mealKey = formMealKey(readings, context, takenAtMs, initial);
  const [attachedMealKey, setAttachedMealKey] = useState(mealKey);
  const isClient = useSyncExternalStore(
    clientFlagSubscribe,
    () => true,
    () => false,
  );
  if (isClient && attachedMealKey !== mealKey) {
    setAttachedMealKey(mealKey);
    if (context === "other" && initial?.context === "other") {
      setNote(initial.note ?? "");
      setPhotos(
        map(photosFromLegacy(initial), (photo) => ({
          url: photo.url ?? "",
          storageId: photo.storageId,
        })),
      );
    } else {
      const media = mealMediaForForm(readings, context, takenAtMs);
      setNote(media.note ?? "");
      setPhotos(
        map(media.photos, (photo) => ({
          url: photo.url ?? "",
          storageId: photo.storageId,
        })),
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

  async function addPhotoFiles(fileList: FileList | File[] | null) {
    if (!fileList || fileList.length === 0) return;
    const remaining = MAX_MEAL_PHOTOS - size(photos);
    const selected = take([...fileList], remaining);
    try {
      const next = await Promise.all(
        map(selected, async (file) => {
          const blob = await fileToJpegBlob(file);
          return { url: URL.createObjectURL(blob), blob };
        }),
      );
      setPhotos((current) => [...current, ...next]);
    } catch {
      toast.error(t("form.photoUnreadable"));
    }
  }

  async function onPhoto(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    await addPhotoFiles(files);
  }

  function onClearPhoto(index: number) {
    setPhotos((current) =>
      filter(current, (_photo, photoIndex) => photoIndex !== index),
    );
  }

  const bounds = glucoseInputBounds(settings.unit);
  const invalidReading = trim(rawValue) !== "" && parsedMgDl === null;
  const invalidTime = !Number.isFinite(takenAtMs);

  async function onArchive() {
    if (!initial || archiving || saving) return;
    setArchiving(true);
    try {
      await archiveReading(initial._id);
      toast.success(t("form.archived"));
      router.push("/");
    } catch {
      toast.error(t("form.saveUnavailable"));
      setArchiving(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving || archiving) return;
    if (parsedMgDl === null) {
      toast.error(t("form.invalidReading", bounds));
      return;
    }
    if (invalidTime) {
      toast.error(t("form.invalidTime"));
      return;
    }
    setSaving(true);
    try {
      const nextPhotos = await Promise.all(
        map(photos, async (photo) => {
          if (photo.blob) {
            if (uploadPhoto) {
              const storageId = await uploadPhoto(photo.blob);
              return { storageId };
            }
            return { url: await blobToDataUrl(photo.blob) };
          }
          return {
            ...(photo.storageId ? { storageId: photo.storageId } : {}),
            ...(photo.url ? { url: photo.url } : {}),
          };
        }),
      );
      const payload = {
        valueMgDl: parsedMgDl,
        context,
        postMealOffset: effectiveOffset(context, postMealOffset),
        note: clampNote(note),
        takenAt: fromDatetimeLocalValue(takenAt),
        photos: nextPhotos,
      };
      if (initial) {
        await updateReading(initial._id, payload);
        toast.success(t("form.updated"));
      } else {
        await addReading(payload);
        toast.success(t("form.saved"));
      }
      router.push("/");
    } catch {
      toast.error(t("form.saveUnavailable"));
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn("flex flex-col gap-6", confirmArchive ? "pb-44" : "pb-28")}
    >
      <section
        className={cn(
          "rounded-3xl px-4 py-6 text-center ring-1 transition-colors",
          get(TONE_SURFACE, status ?? "empty"),
        )}
      >
        <div className="mb-3 flex justify-center">
          <UnitToggle value={settings.unit} onChange={setUnit} />
        </div>
        <Label htmlFor="glucose" className="sr-only">
          Glycémie
        </Label>
        <Input
          id="glucose"
          inputMode="decimal"
          autoComplete="off"
          autoFocus={!initial}
          maxLength={8}
          placeholder={unitPlaceholder(settings.unit)}
          value={rawValue}
          aria-invalid={invalidReading || undefined}
          aria-describedby={invalidReading ? "glucose-error" : undefined}
          onChange={(event) => setRawValue(event.target.value)}
          className="h-20 min-w-0 border-0 bg-transparent text-center font-display text-6xl tracking-tight shadow-none focus-visible:ring-0 md:text-6xl"
        />
        {parsedMgDl !== null ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {formatSecondary(parsedMgDl, settings.unit)}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Unité d’affichage : {settings.unit === "gL" ? "g/L" : settings.unit === "mmol" ? "mmol/L" : "mg/dL"}
          </p>
        )}
        {invalidReading ? (
          <p id="glucose-error" role="alert" className="mt-2 text-sm text-destructive">
            {t("form.invalidReading", bounds)}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col items-center gap-2">
          {status ? <StatusBadge status={status} /> : null}
          <p className="text-sm text-muted-foreground">
            Cible verte ≤ {formatPrimary(band.greenMax, settings.unit)}
            {" · "}orange jusqu’à {formatPrimary(band.orangeMax, settings.unit)}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-medium">Contexte</p>
        <div className="flex flex-wrap gap-2">
          {map(CONTEXTS, (item) => (
            <Chip
              key={item}
              selected={context === item}
              onClick={() => setContext(item)}
            >
              {get(CONTEXT_LABELS, item)}
            </Chip>
          ))}
        </div>
        {isAfterContext(context) ? (
          <div className="flex flex-wrap gap-2">
            <Chip
              selected={postMealOffset === 1}
              onClick={() => setPostMealOffset(1)}
            >
              1h après
            </Chip>
            <Chip
              selected={postMealOffset === 2}
              onClick={() => setPostMealOffset(2)}
            >
              2h après
            </Chip>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Avant repas / autre : cible à jeun (vert jusqu’à{" "}
            {mgDlToGl(band.greenMax).toFixed(2).replace(".", ",")} g/L).
          </p>
        )}
      </section>

      <section className="space-y-2">
        <Label htmlFor="takenAt">Heure</Label>
        <Input
          id="takenAt"
          type="datetime-local"
          required
          value={takenAt}
          aria-invalid={invalidTime || undefined}
          aria-describedby={invalidTime ? "taken-at-error" : undefined}
          onChange={(event) => setTakenAt(event.target.value)}
          className="h-11"
        />
        {invalidTime ? (
          <p id="taken-at-error" role="alert" className="text-sm text-destructive">
            {t("form.invalidTime")}
          </p>
        ) : null}
      </section>

      <section className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Textarea
          id="note"
          value={note}
          maxLength={MAX_NOTE_LENGTH}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ce qui a été mangé…"
          className="min-h-20 wrap-break-word"
        />
        {size(note) > MAX_NOTE_LENGTH - 80 ? (
          <p className="text-xs text-muted-foreground">
            {t("form.noteCount", { count: size(note), max: MAX_NOTE_LENGTH })}
          </p>
        ) : null}
      </section>

      <section className="space-y-2">
        <p className="text-sm font-medium">Photos du repas</p>
        {size(photos) > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {map(photos, (photo, index) => (
              <div key={`${photo.url}-${index}`} className="space-y-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`Photo du repas ${index + 1}`}
                  className="h-28 w-full rounded-xl object-cover"
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => onClearPhoto(index)}
                >
                  Retirer
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        {size(photos) < MAX_MEAL_PHOTOS ? (
          <div className="grid grid-cols-2 gap-2">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground hover:bg-muted/60">
              <Camera className="size-5" />
              <span>Appareil photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={onPhoto}
              />
            </label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground hover:bg-muted/60">
              <Images className="size-5" />
              <span>Galerie</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={onPhoto}
              />
            </label>
          </div>
        ) : null}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
          <Button
            type="submit"
            disabled={
              saving || archiving || parsedMgDl === null || invalidTime
            }
            className="h-12 flex-1 rounded-2xl text-base"
          >
            <Check className="size-4" />
            {saving ? t("form.saving") : t("form.save")}
          </Button>
          {initial && confirmArchive ? (
            <div className="flex flex-col gap-2">
              <p className="text-center text-sm text-muted-foreground">
                {t("form.archivePrompt")}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 min-w-0 flex-1"
                  disabled={archiving}
                  onClick={() => setConfirmArchive(false)}
                >
                  {t("form.cancel")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-11 min-w-0 flex-1"
                  disabled={archiving || saving}
                  onClick={() => void onArchive()}
                >
                  {archiving ? t("form.archiving") : t("form.archive")}
                </Button>
              </div>
            </div>
          ) : initial ? (
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              disabled={saving || archiving}
              onClick={() => setConfirmArchive(true)}
            >
              {t("form.archive")}
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
