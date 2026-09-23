import {
  FileSystemUploadType,
  uploadAsync,
} from "expo-file-system/legacy";
import {
  normalizeImageMimeType,
  storageIdFromUploadBody,
} from "@glowcose/core";

export type LocalPhotoSource = {
  uri: string;
  mimeType?: string | null;
};

/**
 * POST a local ImagePicker URI to a Convex upload URL as raw bytes.
 * Avoids `fetch(file://).blob()`, which fails on React Native for local photos.
 */
export async function uploadLocalPhoto(
  postUrl: string,
  source: LocalPhotoSource,
): Promise<string> {
  const result = await uploadAsync(postUrl, source.uri, {
    httpMethod: "POST",
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: {
      "Content-Type": normalizeImageMimeType(source.mimeType),
    },
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error("Photo upload failed");
  }
  return storageIdFromUploadBody(result.body);
}
