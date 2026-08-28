import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mediapipe/pose"],
  turbopack: {
    resolveAlias: {
      "@mediapipe/pose": {
        browser: "./src/mocks/mediapipe-pose.ts",
        default: "./src/mocks/mediapipe-pose.ts",
      },
    },
  },
};

export default nextConfig;
