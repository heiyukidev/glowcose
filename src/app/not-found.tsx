import Link from "next/link";

import { Logo } from "@/components/logo";
import { t } from "@/lib/i18n";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
      <Logo />
      <h1 className="font-display text-2xl">{t("notFound.page")}</h1>
      <p className="text-sm text-muted-foreground">
        {t("notFound.product")}
      </p>
      <Link href="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
        {t("notFound.backToJournal")}
      </Link>
    </div>
  );
}
