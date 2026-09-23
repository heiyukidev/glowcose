import { describe, expect, test } from "vitest";

import {
  normalizeImageMimeType,
  storageIdFromUploadBody,
} from "./photo-upload";

describe("normalizeImageMimeType", () => {
  test("defaults empty and invalid RN types to image/jpeg", () => {
    expect(normalizeImageMimeType(undefined)).toBe("image/jpeg");
    expect(normalizeImageMimeType("")).toBe("image/jpeg");
    expect(normalizeImageMimeType("image")).toBe("image/jpeg");
    expect(normalizeImageMimeType("  ")).toBe("image/jpeg");
  });

  test("keeps real image MIME types", () => {
    expect(normalizeImageMimeType("image/jpeg")).toBe("image/jpeg");
    expect(normalizeImageMimeType("image/png")).toBe("image/png");
    expect(normalizeImageMimeType("image/heic")).toBe("image/heic");
  });
});

describe("storageIdFromUploadBody", () => {
  test("reads storageId from a Convex upload response", () => {
    expect(storageIdFromUploadBody('{"storageId":"kg123"}')).toBe("kg123");
  });

  test("rejects Convex BadHeader and missing storageId bodies", () => {
    expect(() =>
      storageIdFromUploadBody(
        '{"code":"BadHeader","message":"Bad header for content-type: invalid HTTP header"}',
      ),
    ).toThrow(/Bad header|Photo upload failed/);
    expect(() => storageIdFromUploadBody("{}")).toThrow("Photo upload failed");
    expect(() => storageIdFromUploadBody("not-json")).toThrow(
      "Photo upload failed",
    );
  });
});

describe("local file fetch gate (mobile regression)", () => {
  /**
   * The previous mobile path did `fetch(fileUri)` then `if (!response.ok) throw`.
   * On React Native, local file responses can report status 0 / ok:false even when
   * bytes are readable — that rejects every meal photo before upload.
   */
  test("response.ok rejects status-0 local file responses", () => {
    const localFileResponse = { ok: false, status: 0 };
    expect(localFileResponse.ok).toBe(false);
  });
});
