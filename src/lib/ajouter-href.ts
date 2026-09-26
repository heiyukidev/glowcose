/** Build /ajouter?context=&day= for meal and Autre entry points. */
export function ajouterHref(options: {
  context?: string;
  dayKey?: string;
} = {}): string {
  const params = new URLSearchParams();
  if (options.context) params.set("context", options.context);
  if (options.dayKey) params.set("day", options.dayKey);
  const query = params.toString();
  return query ? `/ajouter?${query}` : "/ajouter";
}
