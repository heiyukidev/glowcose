"use client";

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useReadingsOptional } from "@/components/readings-provider";
import { t } from "@/lib/i18n";
import { isClerkConfigured } from "@/lib/runtime";

function SignOutControl() {
  const readings = useReadingsOptional();
  if (!readings) return null;
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => {
        void readings.signOutCarnet();
      }}
    >
      {t("account.signOut")}
    </Button>
  );
}

export function AppHeader() {
  const clerkEnabled = isClerkConfigured();

  return (
    <header className="flex items-center justify-between gap-3 py-3">
      <Link href="/" className="min-w-0">
        <Logo />
      </Link>
      <div className="flex items-center gap-2">
        {clerkEnabled ? (
          <>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button size="sm" variant="outline">
                  Se connecter
                </Button>
              </SignInButton>
            </Show>
            <Show when="signed-in">
              <SignOutControl />
              <UserButton>
                <UserButton.MenuItems>
                  <UserButton.Action label="manageAccount" />
                </UserButton.MenuItems>
              </UserButton>
            </Show>
          </>
        ) : null}
      </div>
    </header>
  );
}
