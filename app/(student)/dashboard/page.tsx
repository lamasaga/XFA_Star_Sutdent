import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTodos } from "@/lib/todo-generator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Brain,
  Heart,
  Trophy,
  Target,
  CheckCircle2,
  Flame,
} from "lucide-react";
import { MoodQuickRecord } from "@/components/mood-quick-record";
import Link from "next/link";

const QUICK_LINKS = [
  { href: "/assessments", title: "心理测评", desc: "了解自己", icon: Brain, color: "bg-blue-50 text-blue-700" },
  { href: "/mood", title: "记录心情", desc: "连续5天", icon: Heart, color: "bg-red-50 text-red-700" },
  { href: "/milestones", title: "里程碑", desc: "记录成就", icon: Trophy, color: "bg-yellow-50 text-yellow-700" },
  { href: "/activities", title: "活动记录", desc: "课外成长", icon: Target, color: "bg-green-50 text-green-700" },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.studentId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-slate-400">请先登录</p>
      </div>
    );
  }

  const studentId = session.user.studentId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  // 并行获取数据
  const [student, todos, moodEntries, recentComments, recentMilestones, recentActivities] =
    await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        select: {
          name: true,
          class: { select: { name: true, grade: { select: { name: true } } } },
          careerProfile: { select: { level: true, totalScore: true } },
        },
      }),
      generateTodos(studentId),
      prisma.moodEntry.findMany({
        where: {
          studentId,
          date: { gte: weekStart },
        },
        select: { date: true },
        orderBy: { date: "desc" },
      }),
      prisma.comment.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { teacher: { select: { name: true } } },
      }),
      prisma.milestone.findMany({
        where: { studentId },
        orderBy: { occurredAt: "desc" },
        take: 2,
      }),
      prisma.activity.findMany({
        where: { studentId },
        orderBy: { startDate: "desc" },
        take: 1,
        select: { name: true, points: true, startDate: true },
      }),
    ]);

  const level = student?.careerProfile?.level || 1;
  const points = student?.careerProfile?.totalScore || 0;

  // 计算心情连续记录天数
  let moodStreak = 0;
  if (moodEntries.length > 0) {
    const entryDates = new Set(moodEntries.map((e) => new Date(e.date).toDateString()));
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      if (entryDates.has(checkDate.toDateString())) {
        moodStreak++;
      } else if (i > 0) {
        break;
      }
    }
  }

  const moodDaysThisWeek = moodEntries.length;
  const todayMoodRecorded = moodEntries.some(
    (e) => new Date(e.date).toDateString() === today.toDateString()
  );

  // 动态流（最近3条）
  const feedItems: Array<{
    type: string;
    date: Date;
    content: string;
    source?: string;
  }> = [];

  for (const c of recentComments) {
    feedItems.push({
      type: "评语",
      date: c.createdAt,
      content: c.content.slice(0, 60) + (c.content.length > 60 ? "..." : ""),
      source: c.teacher.name,
    });
  }
  for (const m of recentMilestones) {
    feedItems.push({
      type: "里程碑",
      date: m.occurredAt,
      content: m.title,
    });
  }
  for (const a of recentActivities) {
    feedItems.push({
      type: "活动",
      date: a.startDate,
      content: `${a.name} +${a.points}积分`,
    });
  }

  feedItems.sort((a, b) => b.date.getTime() - a.date.getTime());
  const top3Feed = feedItems.slice(0, 3);

  return (
    <div className="space-y-5">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#1a3a5c]">今日工作台</h1>
          <p className="text-sm text-slate-400 mt-0.5">查看今日待办与成长打卡</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#f0d050] text-[#92400e] hover:bg-[#f0d050]">
            Lv.{level}
          </Badge>
          <Badge className="bg-[#1a3a5c] text-white hover:bg-[#1a3a5c]">
            {points}积分
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 左侧：待办 + 动态 */}
        <div className="lg:col-span-2 space-y-5">
          {/* 今日待办 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] text-[#1a3a5c]">今日待办</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {todos.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>今日任务全部完成，继续保持！</span>
                </div>
              ) : (
                todos.map((todo) => (
                  <div key={todo.id} className="flex items-center gap-3 py-2">
                    <Checkbox id={todo.id} />
                    <label
                      htmlFor={todo.id}
                      className="flex-1 text-[13px] text-[#1a3a5c] cursor-pointer"
                    >
                      {todo.text}
                    </label>
                    <Badge
                      variant="outline"
                      className={
                        todo.priority === "high"
                          ? "border-red-200 text-red-600 text-[11px]"
                          : todo.priority === "medium"
                          ? "border-orange-200 text-orange-600 text-[11px]"
                          : "border-slate-200 text-slate-500 text-[11px]"
                      }
                    >
                      {todo.priority === "high" ? "高" : todo.priority === "medium" ? "中" : "低"}
                    </Badge>
                    {todo.action && (
                      <Link href={todo.action}>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] text-[#4a90d9]">
                          去处理
                        </Button>
                      </Link>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 最新动态 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 flex items-center justify-between">
              <CardTitle className="text-[15px] text-[#1a3a5c]">最新动态</CardTitle>
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="h-7 text-[11px] text-[#4a90d9]">
                  查看全部
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {top3Feed.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">暂无动态</p>
              ) : (
                top3Feed.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#4a90d9] mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#1a3a5c] truncate">{item.content}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {item.type}
                        {item.source ? ` · ${item.source}` : ""} ·{" "}
                        {item.date.toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 快捷入口 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href}>
                  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                      <div className={`w-10 h-10 rounded-xl ${link.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-[#1a3a5c]">{link.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{link.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 右侧：心情 + 打卡进度 */}
        <div className="space-y-5">
          {/* 今日心情 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] text-[#1a3a5c]">今日心情</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayMoodRecorded ? (
                <div className="flex items-center gap-2 text-sm text-green-600 py-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>今天的心情已记录</span>
                </div>
              ) : (
                <MoodQuickRecord />
              )}
            </CardContent>
          </Card>

          {/* 本周打卡进度 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] text-[#1a3a5c]">本周打卡进度</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] text-[#1a3a5c]">心情日记</span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    {moodStreak > 0 && <Flame className="w-3 h-3 text-orange-500" />}
                    {moodDaysThisWeek}/7 {moodDaysThisWeek >= 7 ? "✅" : ""}
                  </span>
                </div>
                <Progress value={moodDaysThisWeek} max={7} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] text-[#1a3a5c]">五维自评</span>
                  <span className="text-[11px] text-slate-400">0/1 ⚠️</span>
                </div>
                <Progress value={0} max={1} className="h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] text-[#1a3a5c]">里程碑</span>
                  <span className="text-[11px] text-slate-400">{recentMilestones.length}/3</span>
                </div>
                <Progress value={Math.min(recentMilestones.length, 3)} max={3} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
