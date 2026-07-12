import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `dashboard-ref/` and `admin/` are design references only — never compiled.
  outputFileTracingExcludes: {
    "*": ["./dashboard-ref/**", "./admin/**"],
  },
};

export default nextConfig;
