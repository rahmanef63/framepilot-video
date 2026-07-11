"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { signOut } = useAuthActions();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-line bg-bg/80 px-5 py-3 backdrop-blur">
      <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-accent-ink">▚</span>
        FramePilot
      </Link>
      <nav className="ml-2 flex items-center gap-1 text-sm">
        <Link href="/" className="rounded-md px-3 py-1.5 text-muted hover:bg-panel-2 hover:text-fg">
          Studio
        </Link>
        <Link href="/library" className="rounded-md px-3 py-1.5 text-muted hover:bg-panel-2 hover:text-fg">
          Library
        </Link>
      </nav>
      <div className="ml-auto">
        <Authenticated>
          <Button variant="outline" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        </Authenticated>
        <Unauthenticated>
          <Link href="/library">
            <Button size="sm">Sign in</Button>
          </Link>
        </Unauthenticated>
      </div>
    </header>
  );
}
