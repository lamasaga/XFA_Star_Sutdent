"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
}

function getNavItems(role: string): NavItem[] {
  switch (role) {
    case "STUDENT":
      return [
        { href: "/dashboard", label: "总览" },
        { href: "/profile", label: "成长档案" },
        { href: "/scores", label: "学业成绩" },
        { href: "/space", label: "心灵空间" },
      ];
    case "TEACHER":
      return [
        { href: "/dashboard", label: "工作台" },
        { href: "/t/students", label: "我的学生" },
        { href: "/t/comments", label: "写评语" },
        { href: "/t/warnings", label: "心理预警" },
        { href: "/t/class-profile", label: "班级画像" },
      ];
    case "ADMIN":
      return [
        { href: "/dashboard", label: "数据概览" },
        { href: "/a/students", label: "学生管理" },
        { href: "/a/teachers", label: "教师管理" },
        { href: "/a/classes", label: "班级管理" },
        { href: "/a/assessments", label: "测评管理" },
        { href: "/a/reports", label: "数据报表" },
        { href: "/a/settings", label: "系统设置" },
      ];
    default:
      return [];
  }
}

// 面包屑映射
const BREADCRUMB_MAP: Record<string, string> = {
  dashboard: "工作台",
  profile: "成长档案",
  scores: "学业成绩",
  assessments: "心理测评",
  milestones: "里程碑",
  activities: "活动记录",
  "semester-reports": "学期档案",
  space: "心灵空间",
  students: "我的学生",
  comments: "写评语",
  warnings: "心理预警",
  "class-profile": "班级画像",
  a: "管理",
  t: "教师",
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return null;

  return (
    <nav className="flex items-center gap-2 text-sm text-[#64748b] mb-5">
      <Link href="/dashboard" className="hover:text-[#1a3a5c] transition-colors font-medium">
        首页
      </Link>
      {segments.slice(1).map((segment, i) => (
        <span key={segment} className="flex items-center gap-2">
          <span className="text-[#d1d9e6]">/</span>
          <span className={cn(
            i === segments.length - 2 ? "text-[#1a3a5c] font-semibold" : ""
          )}>
            {BREADCRUMB_MAP[segment] || segment}
          </span>
        </span>
      ))}
    </nav>
  );
}

export function DashboardNav({ role, userName }: { role: string; userName: string }) {
  const pathname = usePathname();
  const navItems = getNavItems(role);
  const [collapsed, setCollapsed] = useState(false);

  const roleLabel = role === "STUDENT" ? "学生端" : role === "TEACHER" ? "教师端" : "管理端";

  return (
    <aside
      className={cn(
        "flex flex-col transition-all duration-300 bg-white shadow-sidebar shrink-0",
        collapsed ? "w-[72px]" : "w-[220px]"
      )}
    >
      {/* Logo区域 */}
      <div className="p-5 border-b border-[#e8edf3]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 bg-gradient-primary shadow-md">
            府
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="font-bold text-[15px] text-[#1a3a5c] tracking-tight whitespace-nowrap">
                一生一案
              </span>
              <p className="text-[11px] text-[#94a3b8] whitespace-nowrap mt-0.5">
                {roleLabel}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 导航 */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-auto">
        <div className="px-3 pb-2">
          <p className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider">
            {collapsed ? "" : "导航"}
          </p>
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-3 rounded-xl text-[13px] transition-all duration-200 font-medium",
                isActive
                  ? "bg-[#1a3a5c] text-white shadow-[0_2px_8px_rgba(26,58,92,0.2)]"
                  : "text-[#64748b] hover:bg-[#e8f0fe] hover:text-[#1a3a5c]"
              )}
              title={collapsed ? item.label : undefined}
            >
              {/* 选中指示条 */}
              {isActive && !collapsed && (
                <span className="w-1 h-5 rounded-full bg-[#f0d050] mr-3 shrink-0" />
              )}
              {!isActive && !collapsed && (
                <span className="w-1 h-5 rounded-full bg-transparent mr-3 shrink-0" />
              )}
              {collapsed && isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#f0d050] mr-2 shrink-0" />
              )}
              <span className={cn("whitespace-nowrap", collapsed && "hidden")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* 底部用户信息 */}
      <div className="p-3 border-t border-[#e8edf3] space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#f8fafc]">
          <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
            {userName.charAt(0)}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[#1a3a5c] truncate">{userName}</p>
              <p className="text-[11px] text-[#94a3b8]">{roleLabel}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center text-[#94a3b8] hover:text-[#1a3a5c] hover:bg-[#e8f0fe] text-[13px]"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          {!collapsed ? "退出登录" : "退出"}
        </Button>
      </div>
    </aside>
  );
}
