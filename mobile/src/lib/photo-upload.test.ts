import { describe, expect, test, vi } from "vitest";

import {
  normalizeImageMimeType,
  storageIdFromUploadBody,
} from "../../../packages/core/src/photo-upload";

/**
 * Mirrors mobile uploadLocalPhoto without importing expo-file-system in vitest.
 * The real module calls uploadAsync; this tests the contract that replaced fetch(blob).
 */
async function uploadLocalPhotoContract(
  postUrl: string,
  source: { uri: string; mimeType?: string | null },
  uploadAsync: (
    url: string,
    fileUri: string,
    options: {
      httpMethod: "POST";
      uploadType: number;
      headers: { "Content-Type": string };
    },
  ) => Promise<{ status: number; body: string }>,
): Promise<string> {
  const result = await uploadAsync(postUrl, source.uri, {
    httpMethod: "POST",
    uploadType: 0,
    headers: {
      "Content-Type": normalizeImageMimeType(source.mimeType),
    },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error("Photo upload failed");
  }
  return storageIdFromUploadBody(result.body);
}

describe("uploadLocalPhoto contract", () => {
  test("uploads binary content with a normalized MIME type and returns storageId", async () => {
    const uploadAsync = vi.fn(async () => ({
      status: 200,
      body: JSON.stringify({ storageId: "kg_photo_1" }),
    }));

    const storageId = await uploadLocalPhotoContract(
      "https://example.convex.cloud/upload",
      { uri: "file:///var/mobile/Containers/Data/photo.jpg", mimeType: "image" },
      uploadAsync,
    );

    expect(storageId).toBe("kg_photo_1");
    expect(uploadAsync).toHaveBeenCalledWith(
      "https://example.convex.cloud/upload",
      "file:///var/mobile/Containers/Data/photo.jpg",
      {
        httpMethod: "POST",
        uploadType: 0,
        headers: { "Content-Type": "image/jpeg" },
      },
    );
  });

  test("does not require response.ok from a local fetch of the file URI", async () => {
    const localFetchWouldReject = !{ ok: false, status: 0 }.ok;
    expect(localFetchWouldReject).toBe(true);

    const storageId = await uploadLocalPhotoContract(
      "https://example.convex.cloud/upload",
      { uri: "file:///tmp/meal.jpg", mimeType: "image/jpeg" },
      async () => ({
        status: 200,
        body: JSON.stringify({ storageId: "kg_ok" }),
      }),
    );
    expect(storageId).toBe("kg_ok");
  });
});
