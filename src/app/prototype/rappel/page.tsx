"use client";

/**
 * Three variants of Rappel CTA placement (Q5), switchable via ?variant=.
 * Throwaway — not production.
 */

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { PrototypeSwitcher } from "@/components/prototype-switcher";
import {
  INITIAL_RAPPEL_STATE,
  type PrototypeRappelState,
} from "@/components/prototype-rappel/mock";
import { PrototypeRappelStatePanel } from "@/components/prototype-rappel/state-panel";
import {
  VariantA,
  VARIANT_A_NAME,
} from "@/components/prototype-rappel/variant-a";
import {
  VariantB,
  VARIANT_B_NAME,
} from "@/components/prototype-rappel/variant-b";
import {
  VariantC,
  VARIANT_C_NAME,
} from "@/components/prototype-rappel/variant-c";
import { Button } from "@/components/ui/button";

const LABELS: Record<string, string> = {
  A: VARIANT_A_NAME,
  B: VARIANT_B_NAME,
  C: VARIANT_C_NAME,
};

function PrototypeRappelInner() {
  const searchParams = useSearchParams();
  const variant = searchParams.get("variant") ?? "A";
  const [state, setState] = useState<PrototypeRappelState>(INITIAL_RAPPEL_STATE);
  const [showInterstitial, setShowInterstitial] = useState(true);
  const [showToast, setShowToast] = useState(true);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-28">
      <AppHeader />
      <div className="mb-4 rounded-xl border border-dashed border-amber-600/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
        PROTOTYPE · Où vit « Rappeler dans 2 h » ? (Q5) ·{" "}
        <code className="font-mono">?variant=A|B|C</code>
      </div>

      <section className="pb-4">
        <p className="text-sm capitalize text-muted-foreground">jeudi 24 septembre</p>
        <h1 className="font-display text-3xl leading-tight tracking-tight">
          Aujourd’hui
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Prototype · placement du Rappel
        </p>
      </section>

      {variant === "B" ? (
        <VariantB
          state={state}
          onChange={setState}
          showInterstitial={showInterstitial}
          setShowInterstitial={setShowInterstitial}
        />
      ) : null}
      {variant === "C" ? (
        <VariantC
          state={state}
          onChange={setState}
          showToast={showToast}
          setShowToast={setShowToast}
        />
      ) : null}
      {variant !== "B" && variant !== "C" ? (
        <VariantA state={state} onChange={setState} />
      ) : null}

      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-9 flex-1 rounded-xl text-xs"
          onClick={() => {
            setState(INITIAL_RAPPEL_STATE);
            setShowInterstitial(true);
            setShowToast(true);
          }}
        >
          Reset état
        </Button>
      </div>

      <PrototypeRappelStatePanel state={state} />
      <PrototypeSwitcher variants={["A", "B", "C"]} labels={LABELS} />
    </div>
  );
}

export default function PrototypeRappelPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Chargement…</div>}>
      <PrototypeRappelInner />
    </Suspense>
  );
}
