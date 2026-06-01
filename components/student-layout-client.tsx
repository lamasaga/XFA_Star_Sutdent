"use client";

import { StudentSidebar } from "@/components/student-sidebar";
import { StudentMobileNav } from "@/components/student-mobile-nav";
import { Breadcrumb } from "@/components/breadcrumb";

interface StudentLayoutClientProps {
  user: {
    name: string;
    studentNo?: string;
    className?: string;
    level: number;
    points: number;
  };
  children: React.ReactNode;
}

export function StudentLayoutClient({ user, children }: StudentLayoutClientProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 桌面端侧边栏 */}
      <StudentSidebar user={user} />

      {/* 移动端顶部汉堡 + 底部 Tab */}
      <StudentMobileNav user={user} />

      {/* 主内容区 */}
      <main className="lg:ml-[240px] min-h-screen">
        {/* 移动端顶部占位（header 高度） */}
        <div className="h-14 lg:hidden" />

        <div className="max-w-[1000px] mx-auto p-4 lg:p-8 pb-24 lg:pb-8">
          <Breadcrumb />
          {children}
        </div>
      </main>
    </div>
  );
}
