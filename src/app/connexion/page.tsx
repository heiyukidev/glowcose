"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { t } from "@/lib/i18n";
import { isClerkConfigured } from "@/lib/runtime";

export default function SignInPage() {
  if (!isClerkConfigured()) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <Logo />
        <h1 className="font-display text-2xl">Mode démo</h1>
        <p className="text-sm text-muted-foreground">
          Clerk n’est pas configuré. Vous pouvez déjà cliquer dans l’app ; les
          mesures restent sur cet appareil.
        </p>
        <Link href="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Ouvrir le carnet
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <Logo />
      <div className="text-center">
        <h1 className="font-display text-2xl">Connexion</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("connexion.lead")}
        </p>
      </div>
      <SignIn routing="hash" fallbackRedirectUrl="/" />
      <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        Continuer en démo
      </Link>
    </div>
  );
}
