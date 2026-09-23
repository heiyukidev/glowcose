import { clamp, size } from "lodash";

export type OpenMealPhotos = {
  urls: string[];
  index: number;
};

export function openMealPhotos(
  urls: readonly string[],
  startIndex: number,
): OpenMealPhotos | null {
  const count = size(urls);
  if (count === 0) return null;
  return {
    urls: [...urls],
    index: clamp(startIndex, 0, count - 1),
  };
}

export function stepMealPhoto(
  open: OpenMealPhotos,
  direction: -1 | 1,
): OpenMealPhotos {
  const last = size(open.urls) - 1;
  return {
    urls: open.urls,
    index: clamp(open.index + direction, 0, Math.max(last, 0)),
  };
}
