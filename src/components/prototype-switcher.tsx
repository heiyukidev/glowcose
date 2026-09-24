"use client";

import { useEffect } from "react";
import { findIndex, get, includes, size } from "lodash";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

/** Throwaway UI prototype chrome — not part of the product. */
export function PrototypeSwitcher({
  variants,
  labels,
}: {
  variants: string[];
  labels?: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("variant") ?? get(variants, 0) ?? "A";
  const index = Math.max(0, findIndex(variants, (key) => key === current));

  function go(nextIndex: number) {
    const wrapped = (nextIndex + size(variants)) % size(variants);
    const key = get(variants, wrapped);
    if (!key) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (includes(["INPUT", "TEXTAREA", "SELECT"], target.tagName) ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(index - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(index + 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // Prototype only: rebind when the active variant index changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, pathname, searchParams]);

  if (process.env.NODE_ENV === "production") return null;

  const label = get(labels, current);
  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2",
        "rounded-full bg-foreground px-2 py-1.5 text-background shadow-lg",
      )}
      role="group"
      aria-label="Prototype variant switcher"
    >
      <button
        type="button"
        className="rounded-full p-2 hover:bg-background/15"
        aria-label="Previous variant"
        onClick={() => go(index - 1)}
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-40 px-1 text-center text-xs font-semibold tracking-wide">
        {current}
        {label ? ` · ${label}` : ""}
      </span>
      <button
        type="button"
        className="rounded-full p-2 hover:bg-background/15"
        aria-label="Next variant"
        onClick={() => go(index + 1)}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
