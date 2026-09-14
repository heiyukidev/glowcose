export function Disclaimer({ className }: { className?: string }) {
  return (
    <p
      className={
        className ??
        "text-center text-xs leading-relaxed text-muted-foreground"
      }
    >
      Glowcose n’est pas un dispositif médical et ne remplace pas un avis
      médical.
    </p>
  );
}
