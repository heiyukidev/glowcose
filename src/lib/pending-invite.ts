import { normalizeInviteCode, PENDING_INVITE_STORAGE_KEY } from "@/lib/carnet";

export function rememberPendingInvite(code: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeInviteCode(code);
  if (!normalized) return;
  window.sessionStorage.setItem(PENDING_INVITE_STORAGE_KEY, normalized);
}

export function readPendingInvite(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(PENDING_INVITE_STORAGE_KEY);
}

export function clearPendingInvite(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
}
