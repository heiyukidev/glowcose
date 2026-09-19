"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { includes } from "lodash";

import { BottomNav } from "@/components/bottom-nav";
import { useSettings } from "@/components/settings-provider";

const OPEN_PATHS = ["/onboarding", "/connexion", "/rejoindre"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, ready } = useSettings();
  const hideNav =
    includes(OPEN_PATHS, pathname) ||
    pathname.startsWith("/ajouter") ||
    pathname.startsWith("/mesure");

  useEffect(() => {
    if (!ready) return;
    if (!settings.onboarded && !includes(OPEN_PATHS, pathname)) {
      router.replace("/onboarding");
    }
  }, [pathname, ready, router, settings.onboarded]);

  if (!ready) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-8">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-14 animate-pulse rounded-2xl bg-muted" />
        <div className="h-52 animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  }

  if (!settings.onboarded && !includes(OPEN_PATHS, pathname)) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-8">
        <div className="h-10 w-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-14 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <>
      <div className={hideNav ? "flex min-h-full flex-1 flex-col" : "flex min-h-full flex-1 flex-col pb-20"}>
        {children}
      </div>
      {hideNav ? null : <BottomNav />}
    </>
  );
}
