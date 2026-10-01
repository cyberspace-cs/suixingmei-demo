import type { NextConfig } from "next";

// `npm run build:pages` 设置 GITHUB_PAGES=true，产出部署到 GitHub Pages 子路径的纯静态站点
const isPages = process.env.GITHUB_PAGES === "true";
const basePath = isPages ? (process.env.PAGES_BASE_PATH ?? "/suixingmei-demo") : "";

const pagesConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  // 静态托管跑不了 route.ts（mock API）；只收 .tsx 即可把它们排除在导出之外，客户端改为在浏览器内调用 mock handler
  pageExtensions: ["tsx"],
};

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost", "0.0.0.0"],
  devIndicators: false,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_STATIC_EXPORT: isPages ? "true" : "",
  },
  ...(isPages ? pagesConfig : {}),
};

export default nextConfig;
