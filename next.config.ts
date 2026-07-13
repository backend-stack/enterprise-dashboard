import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the Firebase Admin SDK is fully traced into the serverless bundle
  // (it's externalized by default, and Vercel functions 500 with
  // ERR_MODULE_NOT_FOUND if tracing misses it).
  outputFileTracingIncludes: {
    "*": ["node_modules/firebase-admin/**"],
  },
};

export default nextConfig;
