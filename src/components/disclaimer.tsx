import { t } from "@/lib/i18n";

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p
      className={
        className ??
        "text-center text-xs leading-relaxed text-muted-foreground"
      }
    >
      {t("brand.disclaimer")}
    </p>
  );
}
