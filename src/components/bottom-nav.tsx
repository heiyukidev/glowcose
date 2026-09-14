"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LineChart, Settings, Sun } from "lucide-react";
import { get, map } from "lodash";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Aujourd’hui", icon: Sun },
  { href: "/historique", label: "Historique", icon: CalendarDays },
  { href: "/graphique", label: "Graphique", icon: LineChart },
  { href: "/reglages", label: "Réglages", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-4 px-2 py-1.5">
        {map(ITEMS, (item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = get(item, "icon");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
