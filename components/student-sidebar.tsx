"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  User,
  BarChart3,
  Brain,
  Heart,
  Trophy,
  Target,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "今日工作台", href: "/dashboard", icon: LayoutDashboard },
  { label: "成长档案", href: "/profile", icon: User },
  { label: "学业成绩", href: "/scores", icon: BarChart3 },
  { label: "心理测评", href: "/assessments", icon: Brain },
  { label: "心情日记", href: "/mood", icon: Heart },
  { label: "里程碑", href: "/milestones", icon: Trophy },
  { label: "活动记录", href: "/activities", icon: Target },
  { label: "学期报告", href: "/semester-reports", icon: FileText },
];

interface StudentSidebarProps {
  user: {
    name: string;
    studentNo?: string;
    className?: string;
    level: number;
    points: number;
  };
}

export function StudentSidebar({ user }: StudentSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-white border-r border-slate-100 flex flex-col z-40 hidden lg:flex">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-slate-100">
        <span className="text-sm font-bold text-[#1a3a5c]">一生一案</span>
      </div>

      {/* 导航项 */}
      <nav className="flex-1 overflow-y-auto py-3 px-3" aria-label="主导航">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors mb-0.5",
                isActive
                  ? "bg-[#f0f9ff] text-[#1a3a5c] font-medium border-l-[3px] border-l-[#4a90d9]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 底部：设置 + 退出 + 用户信息 */}
      <div className="p-3 border-t border-slate-100 space-y-1">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors",
            pathname === "/settings"
              ? "bg-[#f0f9ff] text-[#1a3a5c] font-medium border-l-[3px] border-l-[#4a90d9]"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>设置</span>
        </Link>

        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
          <LogOut className="w-4 h-4 shrink-0" />
          <span>退出登录</span>
        </button>

        {/* 用户信息卡片 */}
        <div className="mt-2 p-3 rounded-lg bg-slate-50">
          <p className="text-[13px] font-medium text-[#1a3a5c]">{user.name}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {user.className ? `${user.className} · ` : ""}学号 {user.studentNo}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f0d050] text-[#92400e] font-medium">
              Lv.{user.level}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#1a3a5c] text-white font-medium">
              {user.points}积分
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
