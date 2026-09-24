"use client";

import { Bell } from "lucide-react";

import { MockMealCard } from "@/components/prototype-rappel/variant-a";
import {
  fireAtInTwoHours,
  type PrototypeRappelState,
} from "@/components/prototype-rappel/mock";

/**
 * Variant C — Both surfaces, different hierarchy.
 * Post-save = compact toast strip (not a full screen).
 * Card = quiet text link under the after cell, not a primary button.
 */
export const VARIANT_C_NAME = "Les deux (toast + lien)";

export function VariantC({
  state,
  onChange,
  showToast,
  setShowToast,
}: {
  state: PrototypeRappelState;
  onChange: (next: PrototypeRappelState) => void;
  showToast: boolean;
  setShowToast: (open: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="px-1 text-xs text-muted-foreground">
        Les deux surfaces : toast compact après save + lien discret sur la
        carte. Pas de gros bouton primaire sous la carte.
      </p>

      {showToast ? (
        <div className="flex items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-background shadow-md">
          <Bell className="size-4 shrink-0 opacity-80" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Avant enregistré</p>
            <p className="text-xs opacity-75">Rappeler pour l’après-repas ?</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg bg-background/15 px-3 py-1.5 text-xs font-semibold"
            onClick={() => {
              onChange({
                ...state,
                rappelFireAt: fireAtInTwoHours(),
                lastAction: "schedule-from-toast",
              });
              setShowToast(false);
            }}
          >
            Dans 2 h
          </button>
          <button
            type="button"
            className="shrink-0 text-xs opacity-70"
            aria-label="Fermer"
            onClick={() => {
              onChange({ ...state, lastAction: "dismiss-toast" });
              setShowToast(false);
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="w-full rounded-xl border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground"
          onClick={() => setShowToast(true)}
        >
          Simuler toast post-save →
        </button>
      )}

      <MockMealCard
        state={state}
        footer={
          state.afterValue ? null : (
            <div className="border-t border-border px-4 py-2.5 text-center">
              {state.rappelFireAt ? (
                <p className="text-xs text-muted-foreground">
                  Rappel {state.rappelFireAt}
                  {" · "}
                  <button
                    type="button"
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                    onClick={() =>
                      onChange({
                        ...state,
                        rappelFireAt: null,
                        lastAction: "cancel-from-card-link",
                      })
                    }
                  >
                    Annuler
                  </button>
                </p>
              ) : (
                <button
                  type="button"
                  className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  onClick={() =>
                    onChange({
                      ...state,
                      rappelFireAt: fireAtInTwoHours(),
                      lastAction: "schedule-from-card-link",
                    })
                  }
                >
                  Rappeler dans 2 h
                </button>
              )}
            </div>
          )
        }
      />
    </div>
  );
}
