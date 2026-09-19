import type { DiabetesType, ThresholdPreset } from "./glucose";
import { join, replace, toUpper } from "lodash";

export const MAX_CARNET_MEMBERS = 2;
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const INVITE_CODE_LENGTH = 6;
export const PENDING_INVITE_STORAGE_KEY = "glowcose.pendingInvite.v1";
export const CARNET_INVITE_WEB_ORIGIN = "https://glowcose.vercel.app";
export const CARNET_INVITE_APP_SCHEME = "glowcose";

export type CarnetInvite = {
  code: string;
  expiresAt: number;
};

export type CarnetSnapshot = {
  carnetId: string;
  memberCount: number;
  diabetesType: DiabetesType;
  thresholds: ThresholdPreset;
  invite: CarnetInvite | null;
};

export function normalizeInviteCode(raw: string): string {
  return toUpper(replace(raw, /[^a-zA-Z0-9]/g, ""));
}

export function formatInviteCode(code: string): string {
  const normalized = normalizeInviteCode(code);
  if (normalized.length <= 3) return normalized;
  return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
}

export function carnetInviteWebUrl(code: string): string {
  const normalized = normalizeInviteCode(code);
  return `${CARNET_INVITE_WEB_ORIGIN}/rejoindre?code=${encodeURIComponent(normalized)}`;
}

export function carnetInviteAppUrl(code: string): string {
  const normalized = normalizeInviteCode(code);
  return `${CARNET_INVITE_APP_SCHEME}://rejoindre?code=${encodeURIComponent(normalized)}`;
}

export function inviteShareMessage(code: string): string {
  return join(
    [
      `Rejoignez le carnet Gluciel avec le code ${formatInviteCode(code)}.`,
      carnetInviteWebUrl(code),
    ],
    "\n",
  );
}
