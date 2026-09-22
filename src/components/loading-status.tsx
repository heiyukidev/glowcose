import type { ReactNode } from "react";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LoadingStatus({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(className)} role="status" aria-live="polite">
      <span className="sr-only">{t("loading.journal")}</span>
      {children}
    </div>
  );
}
