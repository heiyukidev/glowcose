"use client";

import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";

import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isClerkConfigured } from "@/lib/runtime";

export function AppHeader({ demo }: { demo: boolean }) {
  const clerkEnabled = isClerkConfigured();

  return (
    <header className="flex items-center justify-between gap-3 py-3">
      <Link href="/" className="min-w-0">
        <Logo />
      </Link>
      <div className="flex items-center gap-2">
        {demo ? (
          <Badge variant="secondary" className="h-6 rounded-full px-2.5">
            Mode démo
          </Badge>
        ) : null}
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
              <UserButton />
            </Show>
          </>
        ) : null}
      </div>
    </header>
  );
}
