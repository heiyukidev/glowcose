import { describe, expect, test, vi } from "vitest";

import { resolveUploadedMealPhotos } from "./photo-upload";

/**
 * Models expo-file-system uploadAsync under concurrent load (Expo#15347):
 * one in-flight upload succeeds; overlapping uploads fail.
 * Matches the user symptom: one picture works, multiple fail.
 */
function concurrentIntolerantUpload() {
  let inflight = 0;
  return vi.fn(async (uri: string) => {
    inflight += 1;
    const overlapping = inflight > 1;
    await new Promise((r) => setTimeout(r, 5));
    inflight -= 1;
    if (overlapping) {
      throw new Error("Photo upload failed");
    }
    return `kg_${uri}`;
  });
}

describe("resolveUploadedMealPhotos (multi-photo)", () => {
  test("one photo succeeds under concurrent-intolerant upload", async () => {
    const upload = concurrentIntolerantUpload();
    const result = await resolveUploadedMealPhotos(
      ["file:///a.jpg"],
      async (uri) => ({ storageId: await upload(uri) }),
    );
    expect(result).toEqual([{ storageId: "kg_file:///a.jpg" }]);
  });

  test("two photos must all get storageIds (user symptom when parallel)", async () => {
    const upload = concurrentIntolerantUpload();
    const result = await resolveUploadedMealPhotos(
      ["file:///a.jpg", "file:///b.jpg"],
      async (uri) => ({ storageId: await upload(uri) }),
    );
    expect(result).toEqual([
      { storageId: "kg_file:///a.jpg" },
      { storageId: "kg_file:///b.jpg" },
    ]);
    expect(upload).toHaveBeenCalledTimes(2);
  });
});
