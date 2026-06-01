"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  User,
  BarChart3,
  Menu,
  X,
  Brain,
  Heart,
  Trophy,
  Target,
  FileText,
  Settings,
  LogOut,
  ChevronUp,
} from "lucide-react";

const MAIN_TABS = [
  { label: "首页", href: "/dashboard", icon: LayoutDashboard },
  { label: "档案", href: "/profile", icon: User },
  { label: "成绩", href: "/scores", icon: BarChart3 },
];

const MORE_ITEMS = [
  { label: "心理测评", href: "/assessments", icon: Brain },
  { label: "心情日记", href: "/mood", icon: Heart },
  { label: "里程碑", href: "/milestones", icon: Trophy },
  { label: "活动记录", href: "/activities", icon: Target },
  { label: "学期报告", href: "/semester-reports", icon: FileText },
  { label: "设置", href: "/settings", icon: Settings },
];

interface StudentMobileNavProps {
  user: {
    name: string;
    className?: string;
    level: number;
    points: number;
  };
}

export function StudentMobileNav({ user }: StudentMobileNavProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <>
      {/* 顶部：汉堡菜单 */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 z-50 lg:hidden">
        <span className="text-sm font-bold text-[#1a3a5c]">一生一案</span>
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-50"
          aria-label="菜单"
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
      </header>

      {/* 导航抽屉 */}
      {drawerOpen && (
        <>
          {/* 遮罩 */}
          <div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            data-testid="drawer-overlay"
            onClick={() => setDrawerOpen(false)}
          />
          {/* 抽屉 */}
          <div
            data-testid="nav-drawer"
            className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-50 shadow-xl flex flex-col lg:hidden animate-in slide-in-from-left-300"
          >
            <div className="h-14 flex items-center justify-between px-5 border-b border-slate-100">
              <span className="text-sm font-bold text-[#1a3a5c]">一生一案</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-50"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 px-3" aria-label="移动端主导航">
              {[...MAIN_TABS, ...MORE_ITEMS].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-[14px] transition-colors mb-1",
                      isActive(item.href)
                        ? "bg-[#f0f9ff] text-[#1a3a5c] font-medium border-l-[3px] border-l-[#4a90d9]"
                        : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* 底部用户信息 */}
            <div className="p-4 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white text-xs font-bold">
                  {user.name.slice(0, 1)}
                </div>
                <div>
                  <p className="text-[13px] font-medium text-[#1a3a5c]">{user.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {user.className} · Lv.{user.level} · {user.points}积分
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 底部 Tab 栏 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 z-50 lg:hidden safe-area-pb">
        <div className="flex items-center justify-around h-14">
          {MAIN_TABS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors",
                  active ? "text-[#4a90d9]" : "text-slate-400"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}

          {/* 更多按钮 */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors",
              moreOpen ? "text-[#4a90d9]" : "text-slate-400"
            )}
          >
            <div className="relative">
              <Menu className="w-5 h-5" />
              {moreOpen && (
                <ChevronUp className="w-3 h-3 absolute -top-1 -right-1" />
              )}
            </div>
            <span className="text-[10px]">更多</span>
          </button>
        </div>

        {/* 更多展开面板 */}
        {moreOpen && (
          <div className="absolute bottom-14 left-0 right-0 bg-white border-t border-slate-100 shadow-lg">
            <div className="grid grid-cols-3 gap-2 p-3">
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                      active
                        ? "bg-[#f0f9ff] text-[#4a90d9]"
                        : "text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px]">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
