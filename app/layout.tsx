import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/convex-provider";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

function siteUrl(): string {
  const raw = process.env.SITE_URL || "https://frame-pilot.rahmanef.com";
  try {
    return new URL(raw).toString();
  } catch {
    return "https://frame-pilot.rahmanef.com";
  }
}
const SITE_URL = siteUrl();

export const metadata: Metadata = {
  title: "FramePilot — grab stills from any video",
  description:
    "Load a video, scrub to the exact moment, and export crisp still frames. Auto-extract evenly spaced frames, download instantly, or save a session to your library.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "FramePilot",
    description: "Grab crisp still frames from any video, right in your browser.",
    url: SITE_URL,
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ConvexAuthNextjsServerProvider>
          <ConvexClientProvider>
            <SiteHeader />
            {children}
          </ConvexClientProvider>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}
