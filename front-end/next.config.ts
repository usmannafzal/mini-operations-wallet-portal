import path from "path";
import type { NextConfig } from "next";

/**
 * Browser calls go to NEXT_PUBLIC_API_URL (same-origin `/backend` in Docker).
 * Next rewrites those to API_PROXY_TARGET:
 *   - Docker Compose: http://app:3001  (service name on the compose network)
 *   - Local yarn dev: http://localhost:3001
 *
 * Why a rewrite instead of calling http://localhost:3001 from the browser?
 * Inside Compose the Nest hostname is `app`, which the browser cannot resolve.
 * The Next container can, so it proxies on the Docker network.
 */
const apiProxyTarget = (
  process.env.API_PROXY_TARGET ?? "http://localhost:3001"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Needed for the slim production Docker image (copies .next/standalone).
  output: "standalone",
  // Repo root also has a yarn.lock (Nest). Pin Turbopack to this app folder.
  turbopack: {
    root: path.join(__dirname),
  },
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${apiProxyTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
