"use client";

import { useCallback, useRef, useState } from "react";
import { Authenticated, Unauthenticated } from "convex/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { AuthPanel } from "@/components/auth-panel";
import Link from "next/link";

type LocalFrame = {
  id: number;
  blob: Blob;
  url: string;
  timestamp: number;
  width: number;
  height: number;
};

function fmt(t: number): string {
  if (!isFinite(t)) return "0:00.0";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const d = Math.floor((t * 10) % 10);
  return `${m}:${s.toString().padStart(2, "0")}.${d}`;
}

// Wait for the video to actually land on time `t` before we read a pixel — setting
// currentTime is async; drawing before 'seeked' captures the previous frame.
// ponytail: frame-accurate seeking isn't guaranteed across codecs; good enough for stills.
function seekTo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - t) < 1e-3) {
      resolve();
      return;
    }
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = t;
  });
}

export function FrameStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextId = useRef(1);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoName, setVideoName] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [frames, setFrames] = useState<LocalFrame[]>([]);
  const [extractCount, setExtractCount] = useState(6);
  const [extracting, setExtracting] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const createProject = useMutation(api.projects.create);
  const genUpload = useMutation(api.frames.generateUploadUrl);
  const saveFrame = useMutation(api.frames.save);

  const baseName = videoName.replace(/\.[^.]+$/, "") || "frame";

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    frames.forEach((fr) => URL.revokeObjectURL(fr.url));
    setFrames([]);
    setSavedMsg(null);
    setProjectName(f.name.replace(/\.[^.]+$/, ""));
    setVideoName(f.name);
    setVideoUrl(URL.createObjectURL(f));
    setDuration(0);
    setCurrentTime(0);
  };

  const capture = useCallback(async (): Promise<Omit<LocalFrame, "id" | "url"> | null> => {
    const v = videoRef.current;
    const canvas = canvasRef.current;
    if (!v || !canvas || !v.videoWidth) return null;
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) return null;
    return { blob, timestamp: v.currentTime, width: canvas.width, height: canvas.height };
  }, []);

  const addFrame = (cap: Omit<LocalFrame, "id" | "url">) => {
    setFrames((prev) => [...prev, { ...cap, id: nextId.current++, url: URL.createObjectURL(cap.blob) }]);
  };

  const captureCurrent = async () => {
    const cap = await capture();
    if (cap) addFrame(cap);
  };

  const autoExtract = async () => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const n = Math.max(1, Math.min(50, extractCount | 0));
    setExtracting(true);
    v.pause();
    setPlaying(false);
    for (let i = 0; i < n; i++) {
      const t = Math.min(duration * ((i + 0.5) / n), Math.max(0, duration - 0.01));
      await seekTo(v, t);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const cap = await capture();
      if (cap) addFrame(cap);
    }
    setExtracting(false);
  };

  const downloadFrame = (fr: LocalFrame) => {
    const a = document.createElement("a");
    a.href = fr.url;
    a.download = `${baseName}-${fr.timestamp.toFixed(2)}s.png`;
    a.click();
  };

  const removeLocal = (id: number) => {
    setFrames((prev) => {
      const gone = prev.find((f) => f.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((f) => f.id !== id);
    });
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const saveToLibrary = async () => {
    if (frames.length === 0) return;
    setSaving(true);
    setSavedMsg(null);
    try {
      const projectId = await createProject({
        name: projectName || baseName,
        videoName: videoName || "video",
      });
      for (const fr of frames) {
        const uploadUrl = await genUpload({});
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/png" },
          body: fr.blob,
        });
        if (!res.ok) throw new Error("upload failed");
        const { storageId } = await res.json();
        await saveFrame({
          projectId,
          storageId,
          timestamp: fr.timestamp,
          width: fr.width,
          height: fr.height,
        });
      }
      setSavedMsg(`Saved ${frames.length} frame${frames.length > 1 ? "s" : ""} to your library.`);
    } catch {
      setSavedMsg("Save failed — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 lg:grid-cols-[1fr_360px]">
      {/* Left: preview + controls */}
      <section className="space-y-4">
        {!videoUrl ? (
          <label className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-dashed border-line bg-panel text-center transition-colors hover:border-accent">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-panel-2 text-2xl text-accent">
              ⇪
            </span>
            <span className="text-lg font-medium">Drop a video or click to browse</span>
            <span className="text-sm text-muted">MP4, WebM, MOV — stays on your device</span>
            <input type="file" accept="video/*" className="hidden" onChange={onPickFile} />
          </label>
        ) : (
          <>
            <div className="overflow-hidden rounded-[var(--radius)] border border-line bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                className="mx-auto max-h-[60vh] w-full bg-black object-contain"
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onEnded={() => setPlaying(false)}
              />
            </div>

            {/* Scrubber */}
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
                {playing ? "❚❚" : "▶"}
              </Button>
              <input
                type="range"
                className="scrubber flex-1"
                min={0}
                max={duration || 0}
                step={0.01}
                value={currentTime}
                onChange={(e) => {
                  const v = videoRef.current;
                  if (v) v.currentTime = Number(e.target.value);
                  setCurrentTime(Number(e.target.value));
                }}
              />
              <span className="w-24 text-right font-mono text-xs text-muted">
                {fmt(currentTime)} / {fmt(duration)}
              </span>
            </div>

            {/* Capture controls */}
            <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-line bg-panel p-3">
              <Button onClick={captureCurrent}>◉ Grab this frame</Button>
              <div className="ml-auto flex items-center gap-2 text-sm">
                <label className="text-muted">Auto-extract</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={extractCount}
                  onChange={(e) => setExtractCount(Number(e.target.value))}
                  className="w-16 rounded-md border border-line bg-panel-2 px-2 py-1.5 text-center outline-none focus:border-accent"
                />
                <span className="text-muted">frames</span>
                <Button variant="outline" onClick={autoExtract} disabled={extracting}>
                  {extracting ? "Extracting…" : "Extract"}
                </Button>
              </div>
              <label className="w-full cursor-pointer text-center text-xs text-muted hover:text-fg sm:w-auto">
                <input type="file" accept="video/*" className="hidden" onChange={onPickFile} />
                ⇄ Swap video
              </label>
            </div>
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </section>

      {/* Right: captured filmstrip + save */}
      <aside className="space-y-4">
        <div className="rounded-[var(--radius)] border border-line bg-panel p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Captured frames</h2>
            <span className="font-mono text-xs text-muted">{frames.length}</span>
          </div>

          {frames.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              Grab the current frame or auto-extract evenly spaced stills. They appear here.
            </p>
          ) : (
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {frames.map((fr) => (
                <li key={fr.id} className="group relative overflow-hidden rounded-md border border-line bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fr.url} alt={`frame at ${fmt(fr.timestamp)}`} className="aspect-video w-full object-cover" />
                  <span className="absolute left-1 top-1 rounded bg-bg/80 px-1 font-mono text-[10px] text-fg">
                    {fmt(fr.timestamp)}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-bg/85 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={() => downloadFrame(fr)} className="text-xs text-accent hover:underline">
                      Download
                    </button>
                    <button onClick={() => removeLocal(fr.id)} className="text-xs text-red-400 hover:underline">
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Save to library */}
        <div className="rounded-[var(--radius)] border border-line bg-panel p-4">
          <Authenticated>
            <h2 className="font-semibold">Save session</h2>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Session name"
              className="mt-3 w-full rounded-md border border-line bg-panel-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <Button onClick={saveToLibrary} disabled={saving || frames.length === 0} className="mt-3 w-full">
              {saving ? "Saving…" : `Save ${frames.length || ""} to library`}
            </Button>
            {savedMsg && (
              <p className="mt-3 text-sm text-muted">
                {savedMsg}{" "}
                <Link href="/library" className="text-accent hover:underline">
                  View library →
                </Link>
              </p>
            )}
          </Authenticated>
          <Unauthenticated>
            <div className="flex flex-col items-center">
              <AuthPanel />
            </div>
          </Unauthenticated>
        </div>
      </aside>
    </div>
  );
}
