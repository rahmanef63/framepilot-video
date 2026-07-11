# FramePilot

Grab crisp still frames from any video, right in the browser. Scrub to the exact
moment and capture it, or auto-extract evenly spaced stills. Download instantly, or
sign in to keep a capture session (its extracted frames) in your library.

**Live:** https://frame-pilot.rahmanef.com

## Stack

- **Next.js 16** (App Router, standalone output) — deployed on Dokploy.
- **Convex Cloud** — database + file storage for saved frames.
- **@convex-dev/auth** — email + password accounts.

The source video never leaves the client: frames are drawn from a `<video>` element
onto a `<canvas>` and only the extracted PNG stills are uploaded to Convex.

## Develop

```bash
npm install
npx convex dev      # provisions a dev deployment, writes .env.local, watches convex/
npm run dev         # http://localhost:3000
```

## Deploy

Hybrid target (Dokploy frontend + Convex Cloud backend) via the `sc-all` skill. A
production `CONVEX_DEPLOY_KEY` drives the Convex Cloud deploy; its `*.convex.cloud`
URL is baked into the frontend build as `NEXT_PUBLIC_CONVEX_URL`.
