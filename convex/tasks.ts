import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_and_status", (q) => q.eq("userId", userId))
      .collect();

    return tasks;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    reminderTime: v.optional(v.number()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", userId).eq("status", args.status)
      )
      .collect();

    const order = tasks.length;

    await ctx.db.insert("tasks", {
      ...args,
      userId,
      order,
    });
  },
});

export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.taskId, {
      status: args.status,
    });
  },
});

export const updateReminder = mutation({
  args: {
    taskId: v.id("tasks"),
    reminderTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.patch(args.taskId, {
      reminderTime: args.reminderTime,
    });
  },
});
