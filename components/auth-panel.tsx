"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";

// Email + password (@convex-dev/auth Password provider). No reset flow yet.
// ponytail: add password reset (needs an email provider like Resend) when users ask.
export function AuthPanel({ title = "Sign in to save your frames" }: { title?: string }) {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn("password", { email, password, flow });
    } catch {
      setError(
        flow === "signIn"
          ? "Wrong email or password."
          : "Could not create account. Use a valid email and a password of 8+ characters.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-[var(--radius)] border border-line bg-panel p-6"
    >
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">
        {flow === "signIn" ? "Welcome back." : "Create an account — email + password."}
      </p>

      <label className="mt-5 block text-xs font-medium text-muted">Email</label>
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-1 w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm outline-none focus:border-accent"
        placeholder="you@example.com"
      />

      <label className="mt-4 block text-xs font-medium text-muted">Password</label>
      <input
        type="password"
        required
        autoComplete={flow === "signIn" ? "current-password" : "new-password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-1 w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm outline-none focus:border-accent"
        placeholder="••••••••"
      />

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <Button type="submit" disabled={busy} className="mt-5 w-full">
        {busy ? "…" : flow === "signIn" ? "Sign in" : "Create account"}
      </Button>

      <button
        type="button"
        onClick={() => {
          setFlow(flow === "signIn" ? "signUp" : "signIn");
          setError(null);
        }}
        className="mt-3 w-full text-center text-xs text-muted hover:text-fg"
      >
        {flow === "signIn" ? "No account? Sign up" : "Have an account? Sign in"}
      </button>
    </form>
  );
}
