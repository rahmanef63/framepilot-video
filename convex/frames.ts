import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib";

// Short-lived signed URL the client POSTs each extracted PNG to (Convex file storage).
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Record one uploaded still against a project the caller owns.
export const save = mutation({
  args: {
    projectId: v.id("projects"),
    storageId: v.id("_storage"),
    timestamp: v.number(),
    width: v.number(),
    height: v.number(),
  },
  returns: v.id("frames"),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) throw new Error("Project not found");
    return await ctx.db.insert("frames", {
      projectId: args.projectId,
      userId,
      storageId: args.storageId,
      timestamp: args.timestamp,
      width: args.width,
      height: args.height,
      createdAt: Date.now(),
    });
  },
});

// Delete a single frame + its stored image. Owner-scoped.
export const remove = mutation({
  args: { frameId: v.id("frames") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const frame = await ctx.db.get(args.frameId);
    if (!frame || frame.userId !== userId) throw new Error("Frame not found");
    await ctx.storage.delete(frame.storageId);
    await ctx.db.delete(args.frameId);
    return null;
  },
});
