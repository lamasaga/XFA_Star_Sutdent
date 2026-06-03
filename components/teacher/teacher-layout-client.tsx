"use client";

import { TeacherSidebar } from "./teacher-sidebar";

interface TeacherLayoutClientProps {
  user: {
    name: string;
    role: string;
    title?: string;
  };
  children: React.ReactNode;
}

export function TeacherLayoutClient({ user, children }: TeacherLayoutClientProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* 桌面端侧边栏 */}
      <TeacherSidebar user={user} />

      {/* 主内容区 */}
      <main className="lg:ml-[240px] min-h-screen transition-all duration-300">
        {/* 顶部栏 */}
        <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-medium text-[#1a3a5c]">新府学 · 教师工作台</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{user.name}</span>
            <div className="w-8 h-8 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white text-sm font-medium">
              {user.name.charAt(0)}
            </div>
          </div>
        </header>

        {/* 内容 */}
        <div className="max-w-[1200px] mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
