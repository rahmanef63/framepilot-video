import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// authTables = users, authAccounts, authSessions, … (from @convex-dev/auth).
export default defineSchema({
  ...authTables,

  // A saved capture session: one source video → many extracted stills.
  // The video itself is NOT stored (stays client-side); only the stills are persisted.
  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    videoName: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // One extracted still, stored as a PNG in Convex file storage.
  frames: defineTable({
    projectId: v.id("projects"),
    userId: v.id("users"),
    storageId: v.id("_storage"),
    timestamp: v.number(), // seconds into the source video
    width: v.number(),
    height: v.number(),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"]),
});
