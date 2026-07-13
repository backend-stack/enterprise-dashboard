"use client";

import dynamic from "next/dynamic";

// WebGL mesh - client-only so it never runs during SSR.
const WaitlistMesh = dynamic(
  () => import("./WaitlistMesh").then((m) => m.WaitlistMesh),
  { ssr: false }
);

/* Full-bleed monochrome gradient mesh behind the hero copy - the exact
   backdrop from the contextualintelligence.co waitlist screen. */
export function HeroBackdrop() {
  return <WaitlistMesh className="pointer-events-none absolute inset-0" />;
}
