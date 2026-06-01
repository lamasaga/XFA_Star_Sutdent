import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FiveDimensionRadar } from "@/components/radar-chart";
import { ScoreTrendChart } from "@/components/score-trend-chart";
import { createCachedQuery, CACHE_TAGS } from "@/lib/cache";
import Link from "next/link";

const DIMENSION_KEYS = ["学业", "心理", "职业", "社交", "特长"] as const;

// 请求级缓存：单次渲染内复用
const getStudentData = cache(async (studentId: string) => {
  // 并行执行所有独立查询
  const [
    student,
    classmatesProfiles,
    moodEntries,
    recentComments,
    recentMilestones,
    recentActivities,
    scores,
  ] = await Promise.all([
    // 1. 学生基本信息
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: { include: { grade: true } },
        careerProfile: true,
      },
    }),
    // 2. 同班同学五维数据（聚合查询，消除 N+1）
    prisma.careerProfile.findMany({
      where: {
        student: { classId: (await prisma.student.findUnique({
          where: { id: studentId },
          select: { classId: true },
        }))?.classId },
        studentId: { not: studentId },
      },
      select: { fiveDimensions: true },
    }),
    // 3. 最近心情记录（取30天用于计算连续记录）
    prisma.moodEntry.findMany({
      where: {
        studentId,
        date: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: { date: true, rating: true },
      orderBy: { date: "desc" },
      take: 30,
    }),
    // 4. 最新评语
    prisma.comment.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      take: 2,
      include: {
        teacher: { select: { name: true, title: true } },
      },
    }),
    // 5. 最近里程碑
    prisma.milestone.findMany({
      where: { studentId },
      orderBy: { occurredAt: "desc" },
      take: 3,
      select: { id: true, title: true, occurredAt: true },
    }),
    // 6. 最近活动
    prisma.activity.findMany({
      where: { studentId },
      orderBy: { startDate: "desc" },
      take: 3,
      select: { id: true, name: true, role: true, points: true },
    }),
    // 7. 成绩（取最近6个月）
    prisma.score.findMany({
      where: {
        studentId,
        examDate: {
          gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { examDate: "asc" },
      select: {
        subject: true,
        score: true,
        examDate: true,
      },
    }),
  ]);

  if (!student) return null;

  // 计算班级平均分（只解析一次 JSON）
  const classAverage: Record<string, number> = {};
  const dimensionScores: Record<string, number[]> = {
    学业: [], 心理: [], 职业: [], 社交: [], 特长: [],
  };

  for (const profile of classmatesProfiles) {
    if (!profile.fiveDimensions) continue;
    try {
      const dims = JSON.parse(profile.fiveDimensions) as Record<string, number>;
      for (const key of DIMENSION_KEYS) {
        if (typeof dims[key] === "number") {
          dimensionScores[key].push(dims[key]);
        }
      }
    } catch {
      // 忽略解析失败的 JSON
    }
  }

  for (const key of DIMENSION_KEYS) {
    const values = dimensionScores[key];
    classAverage[key] =
      values.length > 0
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : 50;
  }

  // 计算心情连续记录
  let moodStreak = 0;
  if (moodEntries.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entryDates = new Set(
      moodEntries.map((e) => new Date(e.date).toDateString())
    );
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

  // 计算成绩趋势数据
  let scoreTrendData: Array<Record<string, string | number>> = [];
  let scoreSubjects: string[] = [];

  if (scores.length > 0) {
    const dateMap = new Map<string, Record<string, number>>();
    const subjectSet = new Set<string>();

    for (const score of scores) {
      const dateKey = score.examDate.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
      });
      subjectSet.add(score.subject);
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {});
      }
      dateMap.get(dateKey)![score.subject] = score.score;
    }

    scoreSubjects = Array.from(subjectSet);
    scoreTrendData = Array.from(dateMap.entries()).map(([date, sc]) => ({
      date,
      ...sc,
    }));
  }

  // 解析学生自己的五维数据（只解析一次）
  let dimensions: Record<string, number> = {};
  if (student.careerProfile?.fiveDimensions) {
    try {
      dimensions = JSON.parse(student.careerProfile.fiveDimensions);
    } catch {
      dimensions = {};
    }
  }

  return {
    student,
    dimensions,
    totalScore: student.careerProfile?.totalScore || 0,
    level: student.careerProfile?.level || 1,
    classAverage,
    scoreTrendData,
    scoreSubjects,
    moodStreak,
    comments: recentComments,
    milestones: recentMilestones,
    activities: recentActivities,
  };
});

// 跨请求缓存：班级平均分（变化不频繁）
const getCachedClassAverage = createCachedQuery(
  "class-average",
  async (classId: string, studentId: string) => {
    const profiles = await prisma.careerProfile.findMany({
      where: {
        student: { classId },
        studentId: { not: studentId },
      },
      select: { fiveDimensions: true },
    });

    const result: Record<string, number> = {};
    const scores: Record<string, number[]> = {
      学业: [], 心理: [], 职业: [], 社交: [], 特长: [],
    };

    for (const profile of profiles) {
      if (!profile.fiveDimensions) continue;
      try {
        const dims = JSON.parse(profile.fiveDimensions) as Record<string, number>;
        for (const key of DIMENSION_KEYS) {
          if (typeof dims[key] === "number") scores[key].push(dims[key]);
        }
      } catch { /* ignore */ }
    }

    for (const key of DIMENSION_KEYS) {
      const values = scores[key];
      result[key] = values.length > 0
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : 50;
    }
    return result;
  },
  {
    tags: (classId) => [CACHE_TAGS.classAverage(classId)],
    revalidate: 300, // 5 分钟
  }
);

function getDimensionInsight(score: number, average: number, dimension: string): string {
  const diff = score - average;
  if (dimension === "心理") {
    if (score >= 80) return "心理状态良好，继续保持积极心态";
    if (score >= 60) return "心理状态平稳，注意调节压力";
    return "建议关注心理健康，可与心理老师交流";
  }
  if (dimension === "学业") {
    if (diff >= 10) return "学业表现优异，领先班级平均水平";
    if (diff >= -5) return "学业表现稳定，继续保持";
    return "学业有提升空间，建议加强薄弱科目";
  }
  if (dimension === "职业") {
    if (score >= 70) return "职业方向较为明确，建议深化探索";
    return "职业认知有待发展，多参与职业体验活动";
  }
  if (diff >= 5) return "表现突出，继续保持优势";
  if (diff >= -5) return "表现平稳，与班级平均水平相当";
  return "有提升空间，建议多参与相关活动";
}

export async function StudentDashboard({ studentId }: { studentId: string }) {
  const data = await getStudentData(studentId);

  if (!data) return <div>未找到学生信息</div>;

  const {
    student,
    dimensions,
    totalScore,
    level,
    classAverage,
    scoreTrendData,
    scoreSubjects,
    moodStreak,
    comments,
    milestones,
    activities,
  } = data;

  const radarData = DIMENSION_KEYS.map((key) => ({
    dimension: key,
    score: dimensions[key] || 0,
    average: classAverage[key] || 50,
  }));

  const sortedDims = [...radarData].sort((a, b) => b.score - a.score);
  const strongest = sortedDims[0];
  const weakest = sortedDims[sortedDims.length - 1];

  return (
    <div className="space-y-6">
      {/* 欢迎区 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a3a5c]">你好，{student.name}</h1>
          <p className="text-sm text-[#94a3b8] mt-0.5">
            {student.class.grade.name} · {student.class.name} · 学号 {student.studentNo}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-[#f0d050] text-[#92400e] text-sm font-semibold shadow-sm">
            {totalScore} 积分
          </div>
          <div className="px-3 py-1.5 rounded-full bg-[#1a3a5c] text-white text-sm font-semibold shadow-sm">
            Lv.{level}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧 */}
        <div className="lg:col-span-2 space-y-5">
          {/* 五维雷达 */}
          <Card className="border-0 shadow-card-hover rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#f1f5f9]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[15px] text-[#1a3a5c]">五维成长雷达</CardTitle>
                  <CardDescription className="text-xs text-[#94a3b8] mt-0.5">
                    个人得分 vs 班级平均（满分100）
                  </CardDescription>
                </div>
                <Link href="/profile">
                  <Button variant="ghost" size="sm" className="text-[#4a90d9] text-xs h-8">
                    查看详情
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FiveDimensionRadar data={radarData} showAverage={true} height={280} />
                <div className="space-y-3">
                  {radarData.map((d) => (
                    <div key={d.dimension}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-medium text-[#1a3a5c]">{d.dimension}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-[#1a3a5c]">{d.score}</span>
                          <span className="text-[11px] text-[#94a3b8]">班均 {d.average}</span>
                        </div>
                      </div>
                      <Progress value={d.score} max={100} className="h-1.5 mb-1" />
                      <p className="text-[11px] text-[#94a3b8]">
                        {getDimensionInsight(d.score, d.average, d.dimension)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 优势与建议 */}
              <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-[#f1f5f9]">
                <div className="p-3 rounded-lg bg-[#f0f9f0] border border-[#dcfce7]">
                  <p className="text-[11px] text-[#166534] font-semibold mb-1">优势维度</p>
                  <p className="text-[13px] text-[#1a3a5c] font-medium">
                    {strongest.dimension} · {strongest.score}分
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#eff6ff] border border-[#dbeafe]">
                  <p className="text-[11px] text-[#1d4ed8] font-semibold mb-1">建议提升</p>
                  <p className="text-[13px] text-[#1a3a5c] font-medium">
                    {weakest.dimension} · {weakest.score}分
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 成绩趋势 */}
          <Card className="border-0 shadow-card-hover rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#f1f5f9]">
              <CardTitle className="text-[15px] text-[#1a3a5c]">成绩趋势</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              {scoreTrendData.length > 0 ? (
                <ScoreTrendChart data={scoreTrendData} subjects={scoreSubjects} height={240} />
              ) : (
                <div className="text-center py-10 text-[#94a3b8]">
                  <p className="text-sm">暂无成绩数据</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧 */}
        <div className="space-y-5">
          {/* 快捷入口 */}
          <Card className="border-0 shadow-card-hover rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#f1f5f9]">
              <CardTitle className="text-[14px] text-[#1a3a5c]">快捷入口</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-2">
              {[
                { href: "/assessments", label: "心理测评", sub: "了解自己", color: "bg-[#eff6ff] text-[#1a3a5c]" },
                { href: "/space", label: "记录心情", sub: moodStreak > 0 ? `连续${moodStreak}天` : "今天还未记录", color: "bg-[#fef2f2] text-[#991b1b]" },
                { href: "/milestones", label: "里程碑", sub: "记录成就", color: "bg-[#fefce8] text-[#92400e]" },
                { href: "/activities", label: "活动记录", sub: "课外成长", color: "bg-[#f0fdf4] text-[#166534]" },
              ].map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className={`p-3 rounded-lg ${item.color} hover:shadow-md transition-shadow cursor-pointer`}>
                    <p className="text-[13px] font-semibold">{item.label}</p>
                    <p className="text-[11px] opacity-70 mt-0.5">{item.sub}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* 最新评语 */}
          <Card className="border-0 shadow-card-hover rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#f1f5f9]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[14px] text-[#1a3a5c]">最新评语</CardTitle>
                <Link href="/profile" className="text-[11px] text-[#4a90d9] hover:underline">查看全部</Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-[#94a3b8]">暂无评语</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg bg-[#f8fafc]">
                    <p className="text-[13px] text-[#1a202c] line-clamp-2 leading-relaxed">{c.content}</p>
                    <p className="text-[11px] text-[#94a3b8] mt-1.5">
                      {c.teacher.name} · {c.semester}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 最近里程碑 */}
          <Card className="border-0 shadow-card-hover rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#f1f5f9]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[14px] text-[#1a3a5c]">最近里程碑</CardTitle>
                <Link href="/milestones" className="text-[11px] text-[#4a90d9] hover:underline">查看全部</Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              {milestones.length === 0 ? (
                <p className="text-sm text-[#94a3b8]">暂无里程碑</p>
              ) : (
                milestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#f8fafc]">
                    <div className="w-2 h-2 rounded-full bg-[#f0d050] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[13px] text-[#1a202c] truncate">{m.title}</p>
                      <p className="text-[11px] text-[#94a3b8]">
                        {m.occurredAt.toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 最近活动 */}
          <Card className="border-0 shadow-card-hover rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#f1f5f9]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[14px] text-[#1a3a5c]">最近活动</CardTitle>
                <Link href="/activities" className="text-[11px] text-[#4a90d9] hover:underline">查看全部</Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              {activities.length === 0 ? (
                <p className="text-sm text-[#94a3b8]">暂无活动记录</p>
              ) : (
                activities.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#f8fafc]">
                    <div className="min-w-0">
                      <p className="text-[13px] text-[#1a202c] truncate">{a.name}</p>
                      <p className="text-[11px] text-[#94a3b8]">{a.role}</p>
                    </div>
                    <Badge variant="outline" className="text-[11px] shrink-0 border-[#f0d050] text-[#92400e] bg-[#fefce8]">
                      +{a.points}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
