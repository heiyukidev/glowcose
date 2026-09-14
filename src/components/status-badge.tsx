import { get } from "lodash";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusLabel, type ReadingStatus } from "@/lib/glucose";

const STATUS_CLASS: Record<ReadingStatus, string> = {
  in_range:
    "border-transparent bg-[var(--status-in)]/15 text-[var(--status-in-fg)]",
  high: "border-transparent bg-[var(--status-high)]/18 text-[var(--status-high-fg)]",
  very_high:
    "border-transparent bg-[var(--status-alert)]/15 text-[var(--status-alert-fg)]",
  hypo: "border-transparent bg-[var(--status-low)]/15 text-[var(--status-low-fg)]",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ReadingStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("h-6 rounded-full", get(STATUS_CLASS, status), className)}
    >
      {statusLabel(status)}
    </Badge>
  );
}

export function StatusDot({ status }: { status: ReadingStatus }) {
  const colors: Record<ReadingStatus, string> = {
    in_range: "bg-[var(--status-in)]",
    high: "bg-[var(--status-high)]",
    very_high: "bg-[var(--status-alert)]",
    hypo: "bg-[var(--status-low)]",
  };
  return (
    <span
      className={cn("size-2.5 shrink-0 rounded-full", get(colors, status))}
      aria-hidden
    />
  );
}
