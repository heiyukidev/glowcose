"use client";

import type { ReactNode } from "react";
import { Images } from "lucide-react";

import {
  fireAtInTwoHours,
  type PrototypeRappelState,
} from "@/components/prototype-rappel/mock";
import { cn } from "@/lib/utils";

/**
 * Variant A — Card strip only.
 * Rappel lives as a full-width row under the before | after cells.
 * No post-save surface.
 */
export const VARIANT_A_NAME = "Bandeau sous la carte";

export function VariantA({
  state,
  onChange,
}: {
  state: PrototypeRappelState;
  onChange: (next: PrototypeRappelState) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="px-1 text-xs text-muted-foreground">
        CTA uniquement sur la carte repas (après vide). Pas d’écran post-save.
      </p>
      <MockMealCard
        state={state}
        footer={
          state.afterValue ? null : state.rappelFireAt ? (
            <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
              <p className="text-sm">
                Rappel à <span className="font-semibold tabular-nums">{state.rappelFireAt}</span>
              </p>
              <button
                type="button"
                className="text-sm font-medium text-muted-foreground underline-offset-2 hover:underline"
                onClick={() =>
                  onChange({
                    ...state,
                    rappelFireAt: null,
                    lastAction: "cancel-from-card",
                  })
                }
              >
                Annuler
              </button>
            </div>
          ) : (
            <div className="border-t border-border px-3 py-3">
              <button
                type="button"
                className="h-11 w-full rounded-xl bg-foreground text-sm font-semibold text-background active:translate-y-px"
                onClick={() =>
                  onChange({
                    ...state,
                    rappelFireAt: fireAtInTwoHours(),
                    lastAction: "schedule-from-card",
                  })
                }
              >
                Rappeler dans 2 h
              </button>
            </div>
          )
        }
      />
    </div>
  );
}

function MockMealCard({
  state,
  footer,
  afterSlot,
}: {
  state: PrototypeRappelState;
  footer?: ReactNode;
  afterSlot?: ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <h3 className="px-4 pt-3.5 pb-2 text-center font-display text-lg font-medium tracking-tight">
        {state.mealLabel}
      </h3>
      <div className="flex items-stretch gap-2 px-3 pb-3">
        <div className="flex min-h-[5.5rem] flex-1 flex-col items-center justify-center rounded-xl bg-[var(--status-in)]/18 px-2 py-3 text-[var(--status-in-fg)]">
          <span className="font-display text-3xl leading-none tracking-tight tabular-nums">
            {state.beforeValue}
          </span>
          <span className="mt-1 text-xs font-medium opacity-80">g/L</span>
          <span className="mt-1 text-xs font-medium tabular-nums opacity-90">
            {state.beforeTime}
          </span>
        </div>
        <div className="flex w-14 shrink-0 flex-col items-center justify-center gap-1.5 px-0.5">
          <span className="text-xs font-medium tracking-wide text-muted-foreground">
            Photos
          </span>
          <span className="flex size-10 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
            <Images className="size-4" />
          </span>
        </div>
        {afterSlot ?? (
          <div
            className={cn(
              "flex min-h-[5.5rem] flex-1 flex-col items-center justify-center rounded-xl px-2 py-3",
              state.afterValue
                ? "bg-[var(--status-in)]/18 text-[var(--status-in-fg)]"
                : "bg-muted/70 text-muted-foreground ring-1 ring-foreground/8",
            )}
          >
            {state.afterValue ? (
              <>
                <span className="font-display text-3xl leading-none tracking-tight tabular-nums">
                  {state.afterValue}
                </span>
                <span className="mt-1 text-xs font-medium opacity-80">g/L</span>
              </>
            ) : (
              <>
                <span className="font-display text-3xl leading-none tracking-tight">—</span>
                <span className="mt-1 text-xs font-medium opacity-80">+</span>
              </>
            )}
          </div>
        )}
      </div>
      {footer}
    </article>
  );
}

export { MockMealCard };
