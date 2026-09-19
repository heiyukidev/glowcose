"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { useCarnet } from "@/components/carnet-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  carnetInviteWebUrl,
  formatInviteCode,
  MAX_CARNET_MEMBERS,
} from "@/lib/carnet";
import { t } from "@/lib/i18n";
import { isClerkConfigured } from "@/lib/runtime";

export function ShareCarnet() {
  const clerkEnabled = isClerkConfigured();
  const { mine, ready, createInvite, joinWithCode } = useCarnet();
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);

  if (!clerkEnabled) {
    return null;
  }

  const memberCount = mine?.memberCount ?? 1;
  const shared = memberCount >= MAX_CARNET_MEMBERS;
  const invite = mine?.invite;

  async function handleCreate() {
    setBusy(true);
    try {
      await createInvite();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("share.createCode"));
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(carnetInviteWebUrl(invite.code));
      toast.success(t("share.copied"));
    } catch {
      toast.error(t("share.copyLink"));
    }
  }

  async function handleJoin() {
    setBusy(true);
    try {
      await joinWithCode(joinCode);
      setJoinCode("");
      toast.success(t("share.joinSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("share.joinCta"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-8 space-y-3">
      <h2 className="text-sm font-medium">{t("share.title")}</h2>
      {!ready ? (
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      ) : !mine ? (
        <>
          <p className="text-sm text-muted-foreground">{t("share.needAccount")}</p>
          <Link
            href="/connexion"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Se connecter
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {shared
              ? t("share.leadShared", { count: memberCount })
              : t("share.leadSolo")}
          </p>
          {invite ? (
            <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              <p className="font-display text-2xl tracking-[0.2em]">
                {formatInviteCode(invite.code)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("share.codeHint")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleCopy()}
                >
                  {t("share.copyLink")}
                </Button>
                {!shared ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => void handleCreate()}
                  >
                    {t("share.newCode")}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : !shared ? (
            <Button
              className="h-11 rounded-2xl"
              disabled={busy}
              onClick={() => void handleCreate()}
            >
              {t("share.createCode")}
            </Button>
          ) : null}
          {!shared ? (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-medium">{t("share.joinTitle")}</h3>
              <p className="text-xs text-muted-foreground">{t("share.joinLead")}</p>
              <div className="flex gap-2">
                <Input
                  autoCapitalize="characters"
                  autoCorrect="off"
                  className="h-11 font-mono uppercase tracking-widest"
                  placeholder={t("share.joinPlaceholder")}
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value)}
                />
                <Button
                  className="h-11 rounded-2xl"
                  disabled={busy || joinCode.trim() === ""}
                  onClick={() => void handleJoin()}
                >
                  {t("share.joinCta")}
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
