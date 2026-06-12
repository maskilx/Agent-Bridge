import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next never resolves against a parent directory's lockfile.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
