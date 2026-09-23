import { describe, expect, test } from "vitest";

import { openMealPhotos, stepMealPhoto } from "./photo-viewer";

describe("openMealPhotos", () => {
  test("opens every Photo of a Meal, starting at the front of the stack", () => {
    expect(
      openMealPhotos(
        ["front.jpg", "second.jpg", "third.jpg", "fourth.jpg"],
        0,
      ),
    ).toEqual({
      urls: ["front.jpg", "second.jpg", "third.jpg", "fourth.jpg"],
      index: 0,
    });
  });

  test("opens the Photo that was tapped", () => {
    expect(openMealPhotos(["a.jpg", "b.jpg"], 1)).toEqual({
      urls: ["a.jpg", "b.jpg"],
      index: 1,
    });
  });

  test("stays closed when the Meal has no Photos", () => {
    expect(openMealPhotos([], 0)).toBeNull();
  });

  test("clamps a tap that falls outside the Photos", () => {
    expect(openMealPhotos(["only.jpg"], 5)).toEqual({
      urls: ["only.jpg"],
      index: 0,
    });
    expect(openMealPhotos(["only.jpg"], -1)).toEqual({
      urls: ["only.jpg"],
      index: 0,
    });
  });
});

describe("stepMealPhoto", () => {
  const open = {
    urls: ["a.jpg", "b.jpg", "c.jpg"],
    index: 1,
  };

  test("moves to the neighboring Photo of the same Meal", () => {
    expect(stepMealPhoto(open, 1)).toEqual({
      urls: ["a.jpg", "b.jpg", "c.jpg"],
      index: 2,
    });
    expect(stepMealPhoto(open, -1)).toEqual({
      urls: ["a.jpg", "b.jpg", "c.jpg"],
      index: 0,
    });
  });

  test("stays on the current Photo at either end", () => {
    expect(stepMealPhoto({ urls: ["a.jpg", "b.jpg"], index: 0 }, -1)).toEqual({
      urls: ["a.jpg", "b.jpg"],
      index: 0,
    });
    expect(stepMealPhoto({ urls: ["a.jpg", "b.jpg"], index: 1 }, 1)).toEqual({
      urls: ["a.jpg", "b.jpg"],
      index: 1,
    });
  });
});
