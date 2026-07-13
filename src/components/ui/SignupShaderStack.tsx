"use client";

import {
  Shader,
  Swirl,
  ChromaFlow,
  FlutedGlass,
  FilmGrain,
} from "shaders/react";

/**
 * The "Axion Studio" signup shader stack, ported from dashboard-ref.
 *
 * Nested inner→outer (each filter takes the rendered children as its input):
 *   Swirl       — soft white / light-amber flowing base
 *   ChromaFlow  — orange (#ff7d14) directional fluid flow over the base
 *   FlutedGlass — vertical glass ribs refracting everything beneath, with
 *                 chromatic aberration (the orange/amber fringe)
 *   FilmGrain   — faint filmic grain on top
 */
export function SignupShaderStack() {
  return (
    <Shader style={{ width: "100%", height: "100%" }}>
      <FilmGrain strength={0.05}>
        <FlutedGlass
          shape="rounded"
          angle={31}
          frequency={8}
          softness={1}
          speed={0.15}
          refraction={5.5}
          aberration={0.82}
          lightAngle={-90}
          highlight={0.18}
          highlightSoftness={0}
        >
          <ChromaFlow
            baseColor="#ffdcb8"
            upColor="#ff7d14"
            downColor="#ff7d14"
            leftColor="#ff7d14"
            rightColor="#ff7d14"
            momentum={13}
            radius={3.5}
          >
            {/* A light amber base + orange splash so the panel always shows a
                visible warm flow at rest, rather than washing out to white. */}
            <Swirl
              colorA="#fff3e6"
              colorB="#ff7d14"
              detail={2.1}
              speed={0.5}
            />
          </ChromaFlow>
        </FlutedGlass>
      </FilmGrain>
    </Shader>
  );
}

export default SignupShaderStack;
