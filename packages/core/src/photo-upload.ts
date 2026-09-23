import { includes, trim } from "lodash";

/** Convex upload URLs reject bare types like `"image"`; RN blobs often omit type. */
export function normalizeImageMimeType(mimeType?: string | null): string {
  const trimmed = trim(mimeType ?? "");
  if (!trimmed || !includes(trimmed, "/") || trimmed === "image") {
    return "image/jpeg";
  }
  return trimmed;
}

export function storageIdFromUploadBody(body: string): string {
  let payload: { storageId?: string; message?: string };
  try {
    payload = JSON.parse(body) as { storageId?: string; message?: string };
  } catch {
    throw new Error("Photo upload failed");
  }
  if (!payload.storageId) {
    throw new Error(payload.message ?? "Photo upload failed");
  }
  return payload.storageId;
}
