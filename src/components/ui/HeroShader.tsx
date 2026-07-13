"use client";

import dynamic from "next/dynamic";

// pixi.js / WebGL - load client-only so it never runs during SSR.
const HeroShaderStack = dynamic(
  () => import("./HeroShaderStack").then((m) => m.HeroShaderStack),
  { ssr: false },
);

/* Full-bleed hero shader background - light grey base (#efefef) with the
   Swirl → ChromaFlow → FlutedGlass → FilmGrain stack on top. Used as the
   right-hand panel of the auth screens. */
export function HeroShader({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-[#efefef] ${className}`}
      aria-hidden="true"
    >
      <HeroShaderStack />
    </div>
  );
}
