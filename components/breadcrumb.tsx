"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "今日工作台",
  "/profile": "成长档案",
  "/scores": "学业成绩",
  "/assessments": "心理测评",
  "/mood": "心情日记",
  "/milestones": "里程碑",
  "/activities": "活动记录",
  "/semester-reports": "学期报告",
  "/settings": "个人设置",
};

export function Breadcrumb() {
  const pathname = usePathname();

  // Dashboard 不显示面包屑
  if (pathname === "/dashboard") return null;

  const title = PAGE_TITLES[pathname || ""];
  if (!title) return null;

  return (
    <nav aria-label="面包屑" className="flex items-center gap-1.5 text-[14px] text-slate-400 mb-3">
      <Link href="/dashboard" className="hover:text-[#4a90d9] transition-colors">
        首页
      </Link>
      <ChevronRight className="w-3.5 h-3.5" />
      <span className="text-slate-600">{title}</span>
    </nav>
  );
}
