"use client";

import { useConvexAuth, useConvexConnectionState } from "convex/react";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Thin top-edge progress bar while Clerk↔Convex session auth is settling
 * or any Convex request is in flight.
 */
export function NetworkLoadingBar() {
  const { isLoading: authLoading } = useConvexAuth();
  const { hasInflightRequests } = useConvexConnectionState();
  const busy = authLoading || hasInflightRequests;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] overflow-hidden transition-opacity duration-200",
        busy ? "opacity-100" : "opacity-0",
      )}
      role="progressbar"
      aria-busy={busy}
      aria-hidden={!busy}
      aria-label={t("loading.network")}
    >
      <div
        className={cn(
          "h-full w-1/3 bg-primary",
          busy && "animate-network-loading",
        )}
      />
    </div>
  );
}
