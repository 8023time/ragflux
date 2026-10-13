import type { NextConfig } from "next";
import { appConfig } from "./src/config/global";

const apiOrigin = new URL(appConfig.apiBase).origin;

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["127.0.0.1"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
