"use client";

import { Camera, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";
import { get, map } from "lodash";

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
  mgDlToGl,
  parseGlucoseInput,
  readingStatus,
  thresholdsForContext,
  type PostMealOffset,
  type Reading,
  type ReadingContext,
} from "@/lib/glucose";
import { cn } from "@/lib/utils";

const TONE_SURFACE: Record<string, string> = {
  empty: "bg-card ring-foreground/10",
  in_range: "bg-[var(--status-in)]/10 ring-[var(--status-in)]/40",
  high: "bg-[var(--status-high)]/12 ring-[var(--status-high)]/45",
  very_high: "bg-[var(--status-alert)]/10 ring-[var(--status-alert)]/40",
  hypo: "bg-[var(--status-low)]/10 ring-[var(--status-low)]/40",
};

async function fileToStubDataUrl(file: File): Promise<string> {
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
  return canvas.toDataURL("image/jpeg", 0.62);
}

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
  const [takenAt, setTakenAt] = useState(() =>
    toDatetimeLocalValue(initial?.takenAt ?? now.getTime()),
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

  async function onPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setPhotoUrl(await fileToStubDataUrl(file));
    } catch {
      toast.error("Impossible de lire cette photo.");
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (parsedMgDl === null) {
      toast.error("Entrez une glycémie valide.");
      return;
    }
    setSaving(true);
    const payload = {
      valueMgDl: parsedMgDl,
      context,
      postMealOffset: effectiveOffset(context, postMealOffset),
      note: note.trim() || undefined,
      photoUrl,
      takenAt: fromDatetimeLocalValue(takenAt),
    };
    try {
      if (initial) {
        await updateReading(initial._id, payload);
        toast.success("Mesure mise à jour");
      } else {
        await addReading(payload);
        toast.success("Glycémie enregistrée");
      }
      router.push("/");
    } catch {
      toast.error("Enregistrement impossible pour le moment.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 pb-28">
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
          autoFocus={!initial}
          placeholder={unitPlaceholder(settings.unit)}
          value={rawValue}
          onChange={(event) => setRawValue(event.target.value)}
          className="h-20 border-0 bg-transparent text-center font-display text-6xl tracking-tight shadow-none focus-visible:ring-0 md:text-6xl"
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
          value={takenAt}
          onChange={(event) => setTakenAt(event.target.value)}
          className="h-11"
        />
      </section>

      <section className="space-y-2">
        <Label htmlFor="note">Note</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Repas, marche, stress…"
          className="min-h-20"
        />
      </section>

      <section className="space-y-2">
        <p className="text-sm font-medium">Photo du repas</p>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground hover:bg-muted/60">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt="Aperçu du repas"
              className="h-28 w-full rounded-xl object-cover"
            />
          ) : (
            <Camera className="size-5" />
          )}
          <span>
            {photoUrl
              ? "Photo ajoutée (stockage local, stub)"
              : "Ajouter une photo — stub local, R2 plus tard"}
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={onPhoto}
          />
        </label>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
          <Button
            type="submit"
            disabled={saving || parsedMgDl === null}
            className="h-12 flex-1 rounded-2xl text-base"
          >
            <Check className="size-4" />
            {saving ? "Enregistrement…" : initial ? "Enregistrer" : "Enregistrer"}
          </Button>
          {initial ? (
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={async () => {
                await archiveReading(initial._id);
                toast.success("Mesure archivée");
                router.push("/");
              }}
            >
              Archiver
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
