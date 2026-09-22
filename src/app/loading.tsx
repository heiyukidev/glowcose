import { t } from "@/lib/i18n";

export default function Loading() {
  return (
    <div
      className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 py-8"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{t("loading.journal")}</span>
      <div className="h-10 w-40 animate-pulse rounded-xl bg-muted" />
      <div className="h-14 animate-pulse rounded-2xl bg-muted" />
      <div className="h-52 animate-pulse rounded-3xl bg-muted" />
    </div>
  );
}
