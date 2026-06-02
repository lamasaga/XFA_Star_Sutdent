"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  ClipboardList,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: "管理看板", href: "/admin", icon: LayoutDashboard },
  { label: "学生管理", href: "/a/students", icon: Users },
  { label: "教师管理", href: "/a/teachers", icon: GraduationCap },
  { label: "班级管理", href: "/a/classes", icon: School },
  { label: "测评管理", href: "/a/assessments", icon: ClipboardList },
  { label: "数据报表", href: "/a/reports", icon: BarChart3 },
  { label: "系统设置", href: "/a/settings", icon: Settings },
];

interface AdminSidebarProps {
  user: {
    name: string;
    email?: string;
  };
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const width = collapsed ? "w-16" : "w-[240px]";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-white border-r border-slate-100 flex flex-col z-40 hidden lg:flex transition-all duration-300",
        width
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-slate-100 justify-between">
        {!collapsed && (
          <span className="text-sm font-bold text-[#1a3a5c]">管理后台</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-slate-100 text-slate-400"
          title={collapsed ? "展开" : "收起"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* 导航项 */}
      <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="管理导航">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors mb-0.5",
                isActive
                  ? "bg-[#f0f9ff] text-[#1a3a5c] font-medium"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* 底部：退出 + 用户信息 */}
      <div className="p-2 border-t border-slate-100 space-y-1">
        <button
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>退出登录</span>}
        </button>

        {!collapsed && (
          <div className="mt-2 p-3 rounded-lg bg-slate-50">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#1a3a5c]" />
              <p className="text-[13px] font-medium text-[#1a3a5c]">{user.name}</p>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">系统管理员</p>
          </div>
        )}
      </div>
    </aside>
  );
}
