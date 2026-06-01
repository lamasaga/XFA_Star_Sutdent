"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("邮箱或密码错误");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4f8] p-4 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#1a3a5c]/[0.03]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#4a90d9]/[0.05]" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-[#f0d050]/[0.04]" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        {/* Logo 区域 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary mx-auto mb-4 flex items-center justify-center shadow-elevated">
            <span className="text-white text-2xl font-bold">府</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1a3a5c] tracking-tight">
            新府学 · 一生一案
          </h1>
          <p className="text-sm text-[#64748b] mt-1.5">
            学生全周期成长档案与生涯发展平台
          </p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-white rounded-2xl shadow-card-hover p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[13px] font-medium text-[#1a3a5c]">
                邮箱
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="请输入邮箱"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 border-[#d1d9e6] focus:border-[#4a90d9] focus:ring-[#4a90d9]/20 bg-[#f8fafc]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-[13px] font-medium text-[#1a3a5c]">
                密码
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 border-[#d1d9e6] focus:border-[#4a90d9] focus:ring-[#4a90d9]/20 bg-[#f8fafc]"
              />
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-primary hover:opacity-90 text-white font-medium shadow-[0_4px_14px_rgba(26,58,92,0.25)] transition-opacity"
              disabled={loading}
            >
              {loading ? "登录中..." : "登录"}
            </Button>
          </form>

          {/* 测试账号 */}
          <div className="mt-6 pt-5 border-t border-[#e8edf3]">
            <p className="text-xs font-medium text-[#94a3b8] mb-3">测试账号</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => { setEmail("admin@xinfuxue.edu"); setPassword("admin123"); }}
                className="w-full text-left px-3 py-2 rounded-lg bg-[#f8fafc] hover:bg-[#e8f0fe] transition-colors text-[13px] text-[#64748b]"
              >
                <span className="inline-block w-10 font-medium text-[#1a3a5c]">管理员</span>
                <span className="text-[#94a3b8]">admin@xinfuxue.edu / admin123</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail("teacher1@xinfuxue.edu"); setPassword("teacher123"); }}
                className="w-full text-left px-3 py-2 rounded-lg bg-[#f8fafc] hover:bg-[#e8f0fe] transition-colors text-[13px] text-[#64748b]"
              >
                <span className="inline-block w-10 font-medium text-[#1a3a5c]">教师</span>
                <span className="text-[#94a3b8]">teacher1@xinfuxue.edu / teacher123</span>
              </button>
              <button
                type="button"
                onClick={() => { setEmail("student1@xinfuxue.edu"); setPassword("student123"); }}
                className="w-full text-left px-3 py-2 rounded-lg bg-[#f8fafc] hover:bg-[#e8f0fe] transition-colors text-[13px] text-[#64748b]"
              >
                <span className="inline-block w-10 font-medium text-[#1a3a5c]">学生</span>
                <span className="text-[#94a3b8]">student1@xinfuxue.edu / student123</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
