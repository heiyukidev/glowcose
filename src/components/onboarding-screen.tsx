"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { get, map } from "lodash";

import { Disclaimer } from "@/components/disclaimer";
import { Logo } from "@/components/logo";
import { useSettings } from "@/components/settings-provider";
import { Button } from "@/components/ui/button";
import {
  DIABETES_TYPE_LABELS,
  DIABETES_TYPES,
  type DiabetesType,
} from "@/lib/glucose";
import { cn } from "@/lib/utils";

const BLURBS: Record<DiabetesType, string> = {
  gestational:
    "Cibles France CNGOF/SFD : à jeun ≤ 0,95 g/L, 2h ≤ 1,20, 1h ≤ 1,40.",
  type1: "Cibles adultes indicatives (70–180 mg/dL) — à valider avec l’équipe soignante.",
  type2: "Cibles adultes indicatives (préprandial ≤ 130, post ≤ 180 mg/dL).",
  other: "Cibles adultes génériques — vous pourrez les ajuster dans Réglages.",
};

export function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useSettings();
  const [diabetesType, setDiabetesType] =
    useState<DiabetesType>("gestational");

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
      <Logo />
      <h1 className="mt-8 font-display text-3xl tracking-tight">
        Quel diabète suivez-vous ?
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Glowcose charge les couleurs et seuils correspondants. Vous pourrez
        changer plus tard.
      </p>
      <div className="mt-6 grid gap-2">
        {map(DIABETES_TYPES, (type) => (
          <button
            key={type}
            type="button"
            onClick={() => setDiabetesType(type)}
            className={cn(
              "rounded-2xl border px-4 py-3 text-left transition-colors",
              diabetesType === type
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:bg-muted/60",
            )}
          >
            <div className="font-medium">{get(DIABETES_TYPE_LABELS, type)}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {get(BLURBS, type)}
            </div>
          </button>
        ))}
      </div>
      <Button
        className="mt-8 h-12 rounded-2xl text-base"
        onClick={() => {
          completeOnboarding(diabetesType);
          router.replace("/");
        }}
      >
        Continuer
      </Button>
      <Disclaimer className="mt-6 text-center text-xs leading-relaxed text-muted-foreground" />
    </div>
  );
}
