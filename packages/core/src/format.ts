import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { round } from "lodash";

import {
  convertFromMgDl,
  mgDlToGl,
  mgDlToMmol,
  type GlucoseUnit,
} from "./glucose";

const fr2 = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fr1 = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatGl(mgDl: number): string {
  return `${fr2.format(round(mgDlToGl(mgDl), 2))} g/L`;
}

export function formatMgdl(mgDl: number): string {
  return `${Math.round(mgDl)} mg/dL`;
}

export function formatMmol(mgDl: number): string {
  return `${fr1.format(round(mgDlToMmol(mgDl), 1))} mmol/L`;
}

export function formatPrimary(mgDl: number, unit: GlucoseUnit): string {
  if (unit === "gL") return formatGl(mgDl);
  if (unit === "mmol") return formatMmol(mgDl);
  return formatMgdl(mgDl);
}

export function formatSecondary(mgDl: number, unit: GlucoseUnit): string {
  if (unit === "gL") return `${formatMgdl(mgDl)} · ${formatMmol(mgDl)}`;
  if (unit === "mmol") return `${formatGl(mgDl)} · ${formatMgdl(mgDl)}`;
  return `${formatGl(mgDl)} · ${formatMmol(mgDl)}`;
}

export function formatInputValue(mgDl: number, unit: GlucoseUnit): string {
  const value = convertFromMgDl(mgDl, unit);
  if (unit === "mgdl") return String(Math.round(value));
  if (unit === "mmol") return fr1.format(round(value, 1));
  return fr2.format(round(value, 2));
}

export function unitPlaceholder(unit: GlucoseUnit): string {
  if (unit === "gL") return "0,95";
  if (unit === "mmol") return "5,3";
  return "95";
}

export function formatDayHeading(timestamp: number): string {
  return format(timestamp, "EEEE d MMMM", { locale: fr });
}

export function formatTime(timestamp: number): string {
  return format(timestamp, "HH:mm", { locale: fr });
}

export function formatShortDate(timestamp: number): string {
  return format(timestamp, "d MMM", { locale: fr });
}

export function toDatetimeLocalValue(timestamp: number): string {
  return format(timestamp, "yyyy-MM-dd'T'HH:mm");
}

export function fromDatetimeLocalValue(value: string): number {
  return new Date(value).getTime();
}
