"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SignIn, useAuth } from "@clerk/nextjs";

import { Logo } from "@/components/logo";
import { useCarnet } from "@/components/carnet-provider";
import { Button } from "@/components/ui/button";
import { formatInviteCode, normalizeInviteCode } from "@/lib/carnet";
import { t } from "@/lib/i18n";
import { rememberPendingInvite } from "@/lib/pending-invite";
import { isClerkConfigured } from "@/lib/runtime";

function JoinAuthed({ code }: { code: string }) {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { joinWithCode } = useCarnet();
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    rememberPendingInvite(code);
  }, [code]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    void joinWithCode(code)
      .then(() => {
        if (!cancelled) {
          router.replace("/");
        }
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof Error ? caught.message : t("share.joinCta"));
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, code, isLoaded, isSignedIn, joinWithCode, router]);

  if (!isLoaded) {
    return <div className="h-24 w-full animate-pulse rounded-2xl bg-muted" />;
  }

  if (!isSignedIn) {
    return (
      <>
        <p className="text-sm text-muted-foreground">
          {t("rejoindre.signingIn")}
        </p>
        <p className="font-display text-2xl tracking-[0.2em]">
          {formatInviteCode(code)}
        </p>
        <SignIn
          routing="hash"
          fallbackRedirectUrl={`/rejoindre?code=${encodeURIComponent(code)}`}
        />
      </>
    );
  }

  return (
    <>
      <p className="font-display text-2xl tracking-[0.2em]">
        {formatInviteCode(code)}
      </p>
      <p className="text-sm text-muted-foreground">
        {error ?? t("rejoindre.joining")}
      </p>
      {error ? (
        <Button
          className="h-11 rounded-2xl"
          onClick={() => {
            setError(null);
            setAttempt((value) => value + 1);
          }}
        >
          {t("share.joinCta")}
        </Button>
      ) : null}
    </>
  );
}

function JoinBody() {
  const searchParams = useSearchParams();
  const code = normalizeInviteCode(searchParams.get("code") ?? "");
  const clerkEnabled = isClerkConfigured();

  if (!clerkEnabled) {
    return (
      <p className="text-sm text-muted-foreground">{t("share.needAccount")}</p>
    );
  }

  if (!code) {
    return (
      <>
        <p className="text-sm text-muted-foreground">{t("rejoindre.missing")}</p>
        <Link
          href="/reglages"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("settings.title")}
        </Link>
      </>
    );
  }

  return <JoinAuthed code={code} />;
}

export default function RejoindrePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <Logo />
      <h1 className="font-display text-2xl">{t("rejoindre.title")}</h1>
      <Suspense
        fallback={<div className="h-24 w-full animate-pulse rounded-2xl bg-muted" />}
      >
        <JoinBody />
      </Suspense>
      <Link
        href="/"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        {t("notFound.backToJournal")}
      </Link>
    </div>
  );
}
