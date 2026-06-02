"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileEdit,
  AlertTriangle,
  Database,
  FileText,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useState } from "react";

// 教师角色类型
type TeacherRole = "ADMIN" | "HOMEROOM" | "SUBJECT" | "PSYCHOLOGY";

// 导航项配置
interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: TeacherRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "班级看板", href: "/teacher", icon: LayoutDashboard, roles: ["ADMIN", "HOMEROOM", "SUBJECT", "PSYCHOLOGY"] },
  { label: "我的学生", href: "/t/students", icon: Users, roles: ["ADMIN", "HOMEROOM", "SUBJECT", "PSYCHOLOGY"] },
  { label: "写评语", href: "/t/comments", icon: FileEdit, roles: ["ADMIN", "HOMEROOM", "SUBJECT", "PSYCHOLOGY"] },
  { label: "预警中心", href: "/t/warnings", icon: AlertTriangle, roles: ["ADMIN", "HOMEROOM", "SUBJECT", "PSYCHOLOGY"] },
  { label: "数据录入", href: "/t/data-entry", icon: Database, roles: ["ADMIN", "HOMEROOM", "SUBJECT", "PSYCHOLOGY"] },
  { label: "报告生成", href: "/t/reports", icon: FileText, roles: ["ADMIN", "HOMEROOM"] },
  { label: "审核中心", href: "/t/review", icon: CheckSquare, roles: ["ADMIN", "HOMEROOM"] },
];

interface TeacherSidebarProps {
  user: {
    name: string;
    role: string;
    title?: string;
  };
}

export function TeacherSidebar({ user }: TeacherSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // 确定教师角色
  const teacherRole: TeacherRole = user.role === "ADMIN" ? "ADMIN" :
    user.role === "PSYCHOLOGY" ? "PSYCHOLOGY" :
    user.role === "HOMEROOM" ? "HOMEROOM" : "SUBJECT";

  // 过滤出当前角色可见的菜单
  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(teacherRole)
  );

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
          <span className="text-sm font-bold text-[#1a3a5c]">教师工作台</span>
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
      <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="教师导航">
        {visibleItems.map((item) => {
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
        <button className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors",
          collapsed && "justify-center px-2"
        )}>
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>退出登录</span>}
        </button>

        {!collapsed && (
          <div className="mt-2 p-3 rounded-lg bg-slate-50">
            <p className="text-[13px] font-medium text-[#1a3a5c]">{user.name}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {user.title || (teacherRole === "HOMEROOM" ? "班主任" : teacherRole === "PSYCHOLOGY" ? "心理老师" : "任课教师")}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
