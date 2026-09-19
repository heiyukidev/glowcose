import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  normalizeInviteCode,
  PENDING_INVITE_STORAGE_KEY,
} from "@glowcose/core";

export async function rememberPendingInvite(code: string): Promise<void> {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return;
  await AsyncStorage.setItem(PENDING_INVITE_STORAGE_KEY, normalized);
}

export async function readPendingInvite(): Promise<string | null> {
  return await AsyncStorage.getItem(PENDING_INVITE_STORAGE_KEY);
}

export async function clearPendingInvite(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
}
