import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireUser } from "./lib";

// Create a capture session (the source video stays client-side; only its name is kept).
export const create = mutation({
  args: { name: v.string(), videoName: v.string() },
  returns: v.id("projects"),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("projects", {
      userId,
      name: args.name.slice(0, 120),
      videoName: args.videoName.slice(0, 200),
      createdAt: Date.now(),
    });
  },
});

// List the signed-in user's projects, newest first, each with its extracted frames + urls.
// Graceful for anonymous callers (returns []) so a broadly-mounted query never throws.
// ponytail: per-project frame query is N+1, fine at library scale (dozens of projects);
// switch to a single by_user frames scan + client-group if a user ever saves hundreds.
export const listMine = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("projects"),
      _creationTime: v.number(),
      name: v.string(),
      videoName: v.string(),
      createdAt: v.number(),
      frames: v.array(
        v.object({
          _id: v.id("frames"),
          url: v.union(v.string(), v.null()),
          timestamp: v.number(),
          width: v.number(),
          height: v.number(),
        }),
      ),
    }),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return await Promise.all(
      projects.map(async (p) => {
        const frames = await ctx.db
          .query("frames")
          .withIndex("by_project", (q) => q.eq("projectId", p._id))
          .collect();
        const withUrls = await Promise.all(
          frames
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(async (f) => ({
              _id: f._id,
              url: await ctx.storage.getUrl(f.storageId),
              timestamp: f.timestamp,
              width: f.width,
              height: f.height,
            })),
        );
        return {
          _id: p._id,
          _creationTime: p._creationTime,
          name: p.name,
          videoName: p.videoName,
          createdAt: p.createdAt,
          frames: withUrls,
        };
      }),
    );
  },
});

// Delete a project, its frames, and the underlying stored images. Owner-scoped.
export const remove = mutation({
  args: { projectId: v.id("projects") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) throw new Error("Project not found");
    const frames = await ctx.db
      .query("frames")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const f of frames) {
      await ctx.storage.delete(f.storageId);
      await ctx.db.delete(f._id);
    }
    await ctx.db.delete(args.projectId);
    return null;
  },
});
