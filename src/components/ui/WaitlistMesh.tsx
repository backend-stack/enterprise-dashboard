"use client";

import { MeshGradient } from "@paper-design/shaders-react";

/* Exact mesh effect from the reference demo: black base, monochrome
   gradient mesh, plus its faint pulsing light overlays. */
export function WaitlistMesh({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <MeshGradient
        className="absolute inset-0 h-full w-full"
        colors={["#000000", "#1a1a1a", "#333333", "#ffffff"]}
        speed={1}
      />
      <div
        className="absolute left-1/3 top-1/4 h-32 w-32 animate-pulse rounded-full bg-gray-800/5 blur-3xl"
        style={{ animationDuration: "3s" }}
      />
      <div
        className="absolute bottom-1/3 right-1/4 h-24 w-24 animate-pulse rounded-full bg-white/2 blur-2xl"
        style={{ animationDuration: "2s", animationDelay: "1s" }}
      />
      <div
        className="absolute right-1/3 top-1/2 h-20 w-20 animate-pulse rounded-full bg-gray-900/3 blur-xl"
        style={{ animationDuration: "4s", animationDelay: "0.5s" }}
      />
    </div>
  );
}
