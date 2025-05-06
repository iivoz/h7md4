import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    order: v.number(),
    userId: v.id("users"),
    reminderTime: v.optional(v.number()), // Unix timestamp for reminder
    color: v.optional(v.string()), // Task color
  }).index("by_user_and_status", ["userId", "status"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
