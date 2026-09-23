import { describe, expect, test, vi } from "vitest";

import {
  normalizeImageMimeType,
  storageIdFromUploadBody,
} from "./photo-upload";

/** Web upload path: POST a JPEG blob to a Convex upload URL. */
async function uploadPhotoBlob(
  postUrl: string,
  blob: Blob,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const result = await fetchFn(postUrl, {
    method: "POST",
    headers: { "Content-Type": normalizeImageMimeType(blob.type) },
    body: blob,
  });
  if (!result.ok) {
    throw new Error("Photo upload failed");
  }
  return storageIdFromUploadBody(await result.text());
}

describe("web photo blob upload", () => {
  test("posts normalized Content-Type and returns storageId", async () => {
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], {
      type: "",
    });
    const fetchFn = vi.fn(async () => ({
      ok: true,
      text: async () => JSON.stringify({ storageId: "kg_web_1" }),
    })) as unknown as typeof fetch;

    const storageId = await uploadPhotoBlob(
      "https://example.convex.cloud/upload",
      blob,
      fetchFn,
    );

    expect(storageId).toBe("kg_web_1");
    expect(fetchFn).toHaveBeenCalledWith(
      "https://example.convex.cloud/upload",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      }),
    );
  });
});
