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

export const diabetesType = v.union(
  v.literal("gestational"),
  v.literal("type1"),
  v.literal("type2"),
  v.literal("other"),
);

export const bandThresholds = v.object({
  hypoBelow: v.number(),
  greenMax: v.number(),
  orangeMax: v.number(),
});

export const thresholdPreset = v.object({
  beforeMeal: bandThresholds,
  after1h: bandThresholds,
  after2h: bandThresholds,
  other: bandThresholds,
});

export default defineSchema({
  carnets: defineTable({
    createdBy: v.string(),
    createdAt: v.number(),
    diabetesType,
    thresholds: thresholdPreset,
  }).index("by_createdBy", ["createdBy"]),

  carnetMembers: defineTable({
    carnetId: v.id("carnets"),
    userId: v.string(),
    joinedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_carnet", ["carnetId"])
    .index("by_carnet_and_user", ["carnetId", "userId"]),

  carnetInvites: defineTable({
    carnetId: v.id("carnets"),
    code: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    usedBy: v.optional(v.string()),
  })
    .index("by_code", ["code"])
    .index("by_carnet", ["carnetId"]),

  readings: defineTable({
    userId: v.string(),
    carnetId: v.optional(v.id("carnets")),
    recordedBy: v.optional(v.string()),
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
    .index("by_user_takenAt", ["userId", "takenAt"])
    .index("by_carnet", ["carnetId"])
    .index("by_carnet_takenAt", ["carnetId", "takenAt"]),
});
