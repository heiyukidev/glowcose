import { Droplets } from "lucide-react";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_18px_color-mix(in_oklch,var(--primary),transparent_55%)]">
        <Droplets className="size-5" strokeWidth={2.2} />
      </span>
      <span className="font-display text-xl tracking-tight text-foreground">
        {t("brand.name")}
      </span>
    </div>
  );
}
