import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const readingContext = v.union(
  v.literal("before_breakfast"),
  v.literal("after_breakfast"),
  v.literal("before_lunch"),
  v.literal("after_lunch"),
  v.literal("before_dinner"),
  v.literal("after_dinner"),
  v.literal("other"),
);

export const postMealOffset = v.union(v.literal(1), v.literal(2));

export default defineSchema({
  readings: defineTable({
    userId: v.string(),
    valueMgDl: v.number(),
    context: readingContext,
    postMealOffset: v.optional(postMealOffset),
    note: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    takenAt: v.number(),
    createdAt: v.number(),
    archivedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_takenAt", ["userId", "takenAt"]),
});
