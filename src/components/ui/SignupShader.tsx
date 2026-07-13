"use client";

import dynamic from "next/dynamic";

// pixi.js / WebGL — load client-only so it never runs during SSR.
const SignupShaderStack = dynamic(
  () => import("./SignupShaderStack").then((m) => m.SignupShaderStack),
  { ssr: false },
);

/* Full-bleed animated shader backdrop (Swirl → ChromaFlow → FlutedGlass →
   FilmGrain), used behind the auth screens. */
export function SignupShader({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-white ${className}`}
      aria-hidden="true"
    >
      <SignupShaderStack />
    </div>
  );
}
