import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";

export const metadata: Metadata = {
  title: "新府学 · 一生一案",
  description: "新府学私立学校学生全周期成长档案与生涯发展平台",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a3a5c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <head>
        {/* DNS 预解析，加速外部资源加载 */}
        <link rel="dns-prefetch" href="//api.deepseek.com" />
      </head>
      <body className="min-h-full flex flex-col bg-background font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
