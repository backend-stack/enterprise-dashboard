"use client";

/* TEMPORARY preview of the Topbar — delete after review. */

import { Topbar } from "@/components/Topbar";

export default function Preview() {
  return (
    <div className="min-h-screen bg-[var(--ad-cream)] p-6">
      <Topbar />
      <p className="mt-8 text-sm text-[var(--ad-muted)]">Preview canvas</p>
    </div>
  );
}
