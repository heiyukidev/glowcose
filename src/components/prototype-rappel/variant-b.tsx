"use client";

import { Check } from "lucide-react";

import { MockMealCard } from "@/components/prototype-rappel/variant-a";
import {
  fireAtInTwoHours,
  type PrototypeRappelState,
} from "@/components/prototype-rappel/mock";

/**
 * Variant B — Post-save interstitial only.
 * After logging a before, a full confirmation moment owns the remind CTA.
 * Meal card stays clean (optional status chip only).
 */
export const VARIANT_B_NAME = "Écran post-save";

export function VariantB({
  state,
  onChange,
  showInterstitial,
  setShowInterstitial,
}: {
  state: PrototypeRappelState;
  onChange: (next: PrototypeRappelState) => void;
  showInterstitial: boolean;
  setShowInterstitial: (open: boolean) => void;
}) {
  if (showInterstitial) {
    return (
      <div className="space-y-3">
        <p className="px-1 text-xs text-muted-foreground">
          Moment plein écran juste après « Enregistrer » le before. La carte
          n’a pas de bouton Rappeler.
        </p>
        <div className="flex flex-col items-center rounded-3xl bg-card px-6 py-10 text-center ring-1 ring-foreground/10">
          <span className="flex size-14 items-center justify-center rounded-full bg-[var(--status-in)]/25 text-[var(--status-in-fg)]">
            <Check className="size-7" strokeWidth={2.5} />
          </span>
          <h2 className="mt-5 font-display text-2xl tracking-tight">
            Mesure enregistrée
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {state.mealLabel} · avant · {state.beforeValue} g/L
          </p>
          <button
            type="button"
            className="mt-8 h-14 w-full rounded-2xl bg-foreground text-base font-semibold text-background active:translate-y-px"
            onClick={() => {
              onChange({
                ...state,
                rappelFireAt: fireAtInTwoHours(),
                lastAction: "schedule-from-post-save",
              });
              setShowInterstitial(false);
            }}
          >
            Rappeler dans 2 h
          </button>
          <button
            type="button"
            className="mt-3 h-11 w-full text-sm font-medium text-muted-foreground"
            onClick={() => {
              onChange({ ...state, lastAction: "dismiss-post-save" });
              setShowInterstitial(false);
            }}
          >
            Plus tard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="px-1 text-xs text-muted-foreground">
        Carte sans CTA. Relancez l’interstitial pour rejouer le moment
        post-save.
      </p>
      <button
        type="button"
        className="mb-2 w-full rounded-xl border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground"
        onClick={() => setShowInterstitial(true)}
      >
        Simuler « Enregistrer » le before →
      </button>
      <MockMealCard
        state={state}
        footer={
          state.rappelFireAt ? (
            <p className="border-t border-border px-4 py-2.5 text-center text-xs text-muted-foreground">
              Rappel prévu à{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {state.rappelFireAt}
              </span>
              {" · "}
              <button
                type="button"
                className="underline-offset-2 hover:underline"
                onClick={() =>
                  onChange({
                    ...state,
                    rappelFireAt: null,
                    lastAction: "cancel-from-status",
                  })
                }
              >
                Annuler
              </button>
            </p>
          ) : null
        }
      />
    </div>
  );
}
