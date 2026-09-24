/** PROTOTYPE — throwaway mock meal for Rappel CTA placement. */

export type PrototypeRappelState = {
  mealLabel: string;
  beforeValue: string;
  beforeTime: string;
  afterValue: string | null;
  rappelFireAt: string | null;
  lastAction: string;
};

export const INITIAL_RAPPEL_STATE: PrototypeRappelState = {
  mealLabel: "Déjeuner",
  beforeValue: "1,12",
  beforeTime: "12:05",
  afterValue: null,
  rappelFireAt: null,
  lastAction: "idle",
};

export function fireAtInTwoHours(from = new Date()): string {
  const at = new Date(from.getTime() + 2 * 60 * 60 * 1000);
  const hours = String(at.getHours()).padStart(2, "0");
  const minutes = String(at.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
