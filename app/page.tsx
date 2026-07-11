import { FrameStudio } from "@/components/frame-studio";

export default function Home() {
  return (
    <main>
      <section className="mx-auto max-w-6xl px-5 pt-10">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">Frame extraction studio</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Grab crisp still frames from any video.
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Scrub to the exact moment and capture it, or auto-extract evenly spaced frames. Download
          instantly — everything runs in your browser. Sign in to keep a session in your library.
        </p>
      </section>
      <FrameStudio />
    </main>
  );
}
