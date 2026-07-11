import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib";

// ponytail: hard per-user frame ceiling. Bounds Convex-storage abuse from open signup AND
// bounds the projects.remove cascade. Raise the number (or swap for @convex-dev/rate-limiter)
// if real users legitimately hit it.
const MAX_FRAMES_PER_USER = 1000;

// Short-lived signed URL the client POSTs each extracted PNG to (Convex file storage).
// ponytail: auth-gated only. Unsaved uploads orphan (Convex has no blob GC) and minting isn't
// rate-limited — fine for a niche personal tool; add a rate limiter if signup ever goes public.
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
    // Bounded read (.take stops at the ceiling) — only a user near the cap pays for the scan.
    const existing = await ctx.db
      .query("frames")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(MAX_FRAMES_PER_USER + 1);
    if (existing.length > MAX_FRAMES_PER_USER) {
      throw new Error("Frame limit reached — delete some frames to save more.");
    }
    // ponytail: we trust the client-supplied storageId (Convex exposes no uploader identity on
    // _storage). Safe because storageIds are unguessable + not enumerable; if a raw storageId is
    // ever returned/logged to clients, add an uploads-ownership table before trusting it here.
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
