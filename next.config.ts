import type { NextConfig } from "next";

const githubPagesBasePath = process.env.GITHUB_ACTIONS === "true"
  ? "/sunsetometer"
  : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: githubPagesBasePath,
  assetPrefix: githubPagesBasePath,
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
