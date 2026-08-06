import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/*": ["./node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff"],
  },
};

export default nextConfig;
