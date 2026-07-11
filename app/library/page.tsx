"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated, AuthLoading, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AuthPanel } from "@/components/auth-panel";
import { Button } from "@/components/ui/button";

function fmt(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const d = Math.floor((t * 10) % 10);
  return `${m}:${s.toString().padStart(2, "0")}.${d}`;
}

function LibraryGrid() {
  const projects = useQuery(api.projects.listMine);
  const removeProject = useMutation(api.projects.remove);

  if (projects === undefined) {
    return <p className="text-muted">Loading…</p>;
  }
  if (projects.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-line bg-panel p-10 text-center">
        <p className="text-muted">No saved sessions yet.</p>
        <Link href="/" className="mt-2 inline-block text-accent hover:underline">
          Open the studio →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {projects.map((p) => (
        <section key={p._id} className="rounded-[var(--radius)] border border-line bg-panel p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h2 className="font-semibold">{p.name}</h2>
              <p className="text-xs text-muted">
                {p.videoName} · {p.frames.length} frame{p.frames.length === 1 ? "" : "s"}
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm(`Delete "${p.name}" and its ${p.frames.length} frames?`)) {
                  void removeProject({ projectId: p._id });
                }
              }}
            >
              Delete
            </Button>
          </div>
          {p.frames.length > 0 && (
            <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {p.frames.map((f) => (
                <li key={f._id} className="group relative overflow-hidden rounded-md border border-line bg-black">
                  {f.url ? (
                    <a href={f.url} target="_blank" rel="noreferrer" download>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt={`frame at ${fmt(f.timestamp)}`} className="aspect-video w-full object-cover" />
                    </a>
                  ) : (
                    <div className="grid aspect-video w-full place-items-center text-xs text-muted">unavailable</div>
                  )}
                  <span className="absolute left-1 top-1 rounded bg-bg/80 px-1 font-mono text-[10px]">
                    {fmt(f.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Your library</h1>
      <p className="mt-1 text-muted">Saved capture sessions and their extracted frames.</p>

      <div className="mt-8">
        <AuthLoading>
          <p className="text-muted">Loading…</p>
        </AuthLoading>
        <Unauthenticated>
          <div className="flex justify-center py-6">
            <AuthPanel title="Sign in to view your library" />
          </div>
        </Unauthenticated>
        <Authenticated>
          <LibraryGrid />
        </Authenticated>
      </div>
    </main>
  );
}
