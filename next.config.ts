import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // 启用 gzip/brotli 压缩（默认 true，显式声明）
  compress: true,

  // 移除 X-Powered-By 头，减少信息泄露
  poweredByHeader: false,

  // 禁用 ETag（使用 Last-Modified 足够，减少计算开销）
  generateEtags: false,

  // 图片优化：生产环境启用，开发环境可保持未优化以便调试
  images: {
    unoptimized: process.env.NODE_ENV === "development",
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 天缓存
  },

  // HTTP 响应头缓存策略
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        // 静态资源长期缓存
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // 字体文件长期缓存
        source: "/fonts/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // 实验性功能优化
  experimental: {
    // 优化大型包导入（自动 tree-shaking）
    optimizePackageImports: [
      "recharts",
      "lucide-react",
      "@base-ui/react",
    ],
  },

  // Turbopack 配置（Next.js 16 默认启用）
  turbopack: {
    // 启用持久化缓存
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
  },

  // 日志配置
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
};

export default nextConfig;
