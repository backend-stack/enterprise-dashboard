"use client";

import {
  Shader,
  Swirl,
  ChromaFlow,
  FlutedGlass,
  FilmGrain,
} from "shaders/react";

/**
 * "Axion Studio" hero shader stack - a light fluted-glass flow, ported from
 * dashboard-ref (the contextualintelligence.co sign-in panel).
 *
 * Flat sibling filters inside <Shader>, composited in order:
 *   Swirl       - white / light-grey flowing base
 *   ChromaFlow  - orange (#ff5f03) directional fluid flow over the base
 *   FlutedGlass - vertical glass ribs refracting everything beneath, with
 *                 chromatic aberration (the orange fringe)
 *   FilmGrain   - faint filmic grain on top
 */
export function HeroShaderStack() {
  return (
    <Shader style={{ width: "100%", height: "100%" }}>
      <Swirl colorA="#ffffff" colorB="#f0f0f0" detail={1.7} />
      <ChromaFlow
        baseColor="#ffffff"
        downColor="#ff5f03"
        leftColor="#ff5f03"
        rightColor="#ff5f03"
        upColor="#ff5f03"
        momentum={13}
        radius={3.5}
      />
      <FlutedGlass
        aberration={0.61}
        angle={31}
        frequency={8}
        highlight={0.12}
        highlightSoftness={0}
        lightAngle={-90}
        refraction={4}
        shape="rounded"
        softness={1}
        speed={0.15}
      />
      <FilmGrain strength={0.05} />
    </Shader>
  );
}

export default HeroShaderStack;
