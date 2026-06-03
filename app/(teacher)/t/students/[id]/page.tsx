import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SixDimensionRadar } from "@/components/radar-chart";
import { redirect, notFound } from "next/navigation";
import {
  canTeacherViewPsychDetails,
  canTeacherViewMoodNotes,
  canTeacherAccessStudent,
} from "@/lib/teacher-permissions";
import {
  getGradeBenchmark,
  getDimensionLabel,
  SIX_DIMENSIONS,
  type RadarChartItem,
  type SixDimensionData,
  type DimensionKey,
  generateDemoDimensionData,
  calculateBalance,
  getBalanceStatus,
  getDimensionIcon,
  getDimensionDescription,
} from "@/lib/dimension-utils";
import Link from "next/link";
import {
  ArrowLeft,
  Edit3,
  FileText,
  Trophy,
  School,
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
  AlertCircle,
  Calendar,
  User,
  Hash,
  Shield,
} from "lucide-react";

// ==================== 数据获取与转换 ====================

/**
 * 将数据库数据转换为六维展示数据
 * 兼容旧版五维数据格式，优先读取 sixDimensions 字段
 */
async function getSixDimensionData(studentId: string, gradeName: string): Promise<SixDimensionData> {
  const careerProfile = await prisma.careerProfile.findUnique({
    where: { studentId },
  });

  const benchmark = getGradeBenchmark(gradeName);

  // 从 sixDimensions 读取当前六维数据
  let sixDimData: Record<string, number> = {};
  if (careerProfile?.sixDimensions) {
    try {
      sixDimData = JSON.parse(careerProfile.sixDimensions);
    } catch {
      sixDimData = {};
    }
  }

  // 从 dimensionHistory 读取历史数据（取最近一条作为上学期）
  let previousData: Record<DimensionKey, { score: number }> | undefined;
  if (careerProfile?.dimensionHistory) {
    try {
      const history = JSON.parse(careerProfile.dimensionHistory) as Array<{
        semester: string;
        scores: Record<DimensionKey, number>;
      }>;
      if (history.length > 1) {
        const prev = history[history.length - 2]; // 倒数第二条（上学期）
        previousData = Object.fromEntries(
          Object.entries(prev.scores).map(([k, v]) => [k, { score: v }])
        ) as Record<DimensionKey, { score: number }>;
      }
    } catch {
      previousData = undefined;
    }
  }

  // 有数据则构建完整结构，无数据使用演示数据
  if (Object.keys(sixDimData).length > 0) {
    return buildSixDimensionFromScores(
      sixDimData as Record<DimensionKey, number>,
      benchmark,
      gradeName,
      previousData
    );
  }

  return generateDemoDimensionData(gradeName);
}

/**
 * 从分数构建完整的六维数据（含三层拆分）
 */
function buildSixDimensionFromScores(
  scores: Record<DimensionKey, number>,
  benchmark: number,
  gradeName: string,
  previousData?: Record<DimensionKey, { score: number }>
): SixDimensionData {
  const current: SixDimensionData["current"] = {} as any;

  for (const dim of SIX_DIMENSIONS) {
    let score = scores[dim.key] || 0;

    // 检测旧格式（0-100 分制）并转换为新格式（基准分 + 成长分）
    if (score > 0 && score <= 100) {
      score = Math.round(benchmark + (score / 100) * 60);
    }

    // 兜底：缺失数据用基准分 + 36（底线分）
    if (score < benchmark) {
      score = benchmark + 36;
    }

    const growth = Math.max(0, score - benchmark);

    // 估算三层拆分（实际应由后端算法计算）
    const base = Math.min(36, growth);
    const remaining = growth - base;
    const performance = Math.min(12, remaining * 0.6);
    const excellence = Math.min(12, remaining - performance);

    // 计算环比变化（相对于上学期）
    let change = 0;
    if (previousData?.[dim.key]?.score) {
      change = score - previousData[dim.key].score;
    }

    current[dim.key] = {
      score,
      benchmark,
      growth,
      breakdown: {
        base: Math.round(base),
        performance: Math.round(performance),
        excellence: Math.round(excellence),
      },
      label: getDimensionLabel(score, benchmark),
      change,
    };
  }

  const previous: Record<DimensionKey, { score: number }> | undefined = previousData
    ? Object.fromEntries(
        SIX_DIMENSIONS.map((dim) => [
          dim.key,
          { score: previousData[dim.key]?.score || benchmark + 36 },
        ])
      ) as Record<DimensionKey, { score: number }>
    : undefined;

  return {
    current,
    previous,
    semester: "2025-2026-1",
    gradeName,
  };
}

// ==================== 页面组件 ====================

interface PageProps {
  params: { id: string };
}

export default async function TeacherStudentDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  // 1. 登录检查
  if (!session?.user?.teacherId) {
    redirect("/login");
  }

  const teacherId = session.user.teacherId;
  const teacherRole = session.user.teacherRole || "SUBJECT";
  const studentId = params.id;

  // 2. 权限检查：教师只能查看自己所教班级的学生（心理老师可看全校）
  const canAccess = await canTeacherAccessStudent(teacherId, teacherRole, studentId);
  if (!canAccess) {
    redirect("/t/students");
  }

  // 3. 并行获取学生数据
  const [student, comments, milestones, activities, scores, moodEntries, assessments] =
    await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        include: {
          class: { include: { grade: true } },
          user: { select: { email: true, avatar: true } },
          careerProfile: { select: { sixDimensions: true } },
        },
      }),
      prisma.comment.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" },
        include: { teacher: { select: { id: true, name: true, title: true } } },
      }),
      prisma.milestone.findMany({
        where: { studentId },
        orderBy: { occurredAt: "desc" },
      }),
      prisma.activity.findMany({
        where: { studentId },
        orderBy: { startDate: "desc" },
      }),
      prisma.score.findMany({
        where: { studentId },
        orderBy: { examDate: "desc" },
      }),
      prisma.moodEntry.findMany({
        where: { studentId },
        orderBy: { date: "desc" },
        take: 30,
      }),
      prisma.assessment.findMany({
        where: { studentId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  if (!student) {
    notFound();
  }

  const gradeName = student.class?.grade?.name || "高一";
  const sixDimData = await getSixDimensionData(studentId, gradeName);

  // 雷达图数据
  const radarData: RadarChartItem[] = SIX_DIMENSIONS.map((dim) => {
    const detail = sixDimData.current[dim.key];
    const prev = sixDimData.previous?.[dim.key];
    return {
      dimension: dim.key,
      current: detail.score,
      previous: prev?.score,
      label: detail.label.label,
      labelColor: detail.label.color,
      change: detail.change,
    };
  });

  // 均衡度
  const scoresMap = Object.fromEntries(
    SIX_DIMENSIONS.map((d) => [d.key, sixDimData.current[d.key].score])
  );
  const balance = calculateBalance(scoresMap);
  const balanceStatus = getBalanceStatus(balance);

  // 排序找出优势和短板
  const sortedDims = [...SIX_DIMENSIONS].sort(
    (a, b) => sixDimData.current[b.key].score - sixDimData.current[a.key].score
  );
  const strongest = sortedDims[0];
  const weakest = sortedDims[sortedDims.length - 1];

  // 心情日记摘要统计
  const moodStats = {
    total: moodEntries.length,
    avgRating:
      moodEntries.length > 0
        ? (moodEntries.reduce((sum, m) => sum + m.rating, 0) / moodEntries.length).toFixed(1)
        : "-",
    trend:
      moodEntries.length >= 7
        ? moodEntries.slice(0, 7).reduce((sum, m) => sum + m.rating, 0) / 7 -
          moodEntries.slice(7, 14).reduce((sum, m) => sum + m.rating, 0) /
            Math.min(7, moodEntries.length - 7)
        : null,
  };

  // 成长时间线数据
  const timeline = [
    ...scores.map((s) => ({
      type: "成绩" as const,
      date: s.examDate,
      title: `${s.examType || "考试"} · ${s.subject} · ${s.score}分`,
      detail: s.classRank ? `班级排名 ${s.classRank}` : undefined,
    })),
    ...comments.map((c) => ({
      type: "评语" as const,
      date: c.createdAt,
      title: `${c.teacher.name}：${c.content.slice(0, 40)}${c.content.length > 40 ? "..." : ""}`,
      detail: c.content,
      teacherId: c.teacherId,
      dimensions: c.dimensions,
    })),
    ...milestones.map((m) => ({
      type: "里程碑" as const,
      date: m.occurredAt,
      title: m.title,
      status: m.status,
    })),
    ...activities.map((a) => ({
      type: "活动" as const,
      date: a.startDate,
      title: `${a.name} +${a.points}积分`,
      detail: a.result || undefined,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // 成绩按科目分组（用于趋势表格）
  const scoresBySubject = scores.reduce((acc, s) => {
    if (!acc[s.subject]) acc[s.subject] = [];
    acc[s.subject].push(s);
    return acc;
  }, {} as Record<string, typeof scores>);

  // 是否可以查看心理详情
  const canViewPsych = canTeacherViewPsychDetails(teacherRole);
  const canViewMood = canTeacherViewMoodNotes(teacherRole);

  return (
    <div className="space-y-5">
      {/* 返回导航 */}
      <div className="flex items-center gap-2">
        <Link
          href="/t/students"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#1a3a5c] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回学生列表
        </Link>
      </div>

      {/* 学生基本信息栏 */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white text-xl font-bold">
                {student.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#1a3a5c]">{student.name}</h1>
                <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5" />
                    {student.studentNo}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <School className="h-3.5 w-3.5" />
                    {student.class?.grade?.name}
                    {student.class?.name}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {student.gender === "MALE" ? "男" : student.gender === "FEMALE" ? "女" : "未知"}
                  </span>
                  <Badge variant="outline" className="text-xs h-5">
                    {student.status === "ENROLLED" ? "在读" : student.status}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/t/comments?studentId=${studentId}`}>
                <Button size="sm" className="gap-1.5">
                  <FileText className="h-4 w-4" />
                  写评语
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 左侧：雷达图 + 时间线 */}
        <div className="lg:col-span-2 space-y-5">
          {/* 六维雷达图 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[15px] text-[#1a3a5c]">六维成长雷达</CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    {sixDimData.semester} · 基准{getGradeBenchmark(gradeName)} + 成长分
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400">{balanceStatus.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SixDimensionRadar
                  data={radarData}
                  benchmark={getGradeBenchmark(gradeName)}
                  height={300}
                />
                <div className="space-y-2">
                  {SIX_DIMENSIONS.map((dim) => {
                    const detail = sixDimData.current[dim.key];
                    return (
                      <div key={dim.key} className="flex items-center gap-3">
                        <span className="text-lg">{dim.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[13px] font-medium text-[#1a3a5c]">{dim.key}</span>
                            <div className="flex items-center gap-1.5">
                              {detail.change !== undefined && (
                                <span
                                  className={`text-[11px] font-medium ${
                                    detail.change > 0
                                      ? "text-green-600"
                                      : detail.change < 0
                                      ? "text-red-600"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {detail.change > 0 ? "↑" : detail.change < 0 ? "↓" : "→"}
                                  {Math.abs(detail.change)}
                                </span>
                              )}
                              <span
                                className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{
                                  color: detail.label.color,
                                  backgroundColor: detail.label.bgColor,
                                }}
                              >
                                {detail.label.label}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.round((detail.score / (detail.benchmark + 60)) * 100)
                                  )}%`,
                                  backgroundColor: dim.color,
                                }}
                              />
                            </div>
                            <span className="text-[11px] text-slate-500 w-12 text-right">
                              {detail.score}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 优势与建议 */}
              <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-100">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-[11px] text-green-700 font-semibold mb-1">🏆 优势维度</p>
                  <p className="text-[13px] text-[#1a3a5c] font-medium">
                    {getDimensionIcon(strongest.key)} {strongest.key} · {sixDimData.current[strongest.key].score}分
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {getDimensionDescription(strongest.key)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-[11px] text-amber-700 font-semibold mb-1">💡 建议关注</p>
                  <p className="text-[13px] text-[#1a3a5c] font-medium">
                    {getDimensionIcon(weakest.key)} {weakest.key} · {sixDimData.current[weakest.key].score}分
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {getDimensionDescription(weakest.key)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 成长时间线 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] text-[#1a3a5c]">成长时间线</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="全部">
                <TabsList className="mb-4">
                  {["全部", "成绩", "评语", "里程碑", "活动"].map((t) => (
                    <TabsTrigger key={t} value={t} className="text-[12px]">
                      {t}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {["全部", "成绩", "评语", "里程碑", "活动"].map((filter) => (
                  <TabsContent key={filter} value={filter}>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {timeline
                        .filter((item) => filter === "全部" || item.type === filter)
                        .map((item, i) => (
                          <div key={i} className="flex items-start gap-3 py-2">
                            <div
                              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                item.type === "成绩"
                                  ? "bg-blue-500"
                                  : item.type === "评语"
                                  ? "bg-purple-500"
                                  : item.type === "里程碑"
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] h-5">
                                  {item.type}
                                </Badge>
                                <span className="text-[11px] text-slate-400">
                                  {item.date.toLocaleDateString("zh-CN")}
                                </span>
                                {/* 评语可编辑标识 */}
                                {"teacherId" in item && item.teacherId === teacherId && (
                                  <Link href={`/t/comments?studentId=${studentId}&edit=${item.teacherId}`}>
                                    <Badge className="text-[10px] h-5 bg-blue-100 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-200">
                                      <Edit3 className="h-2.5 w-2.5 mr-0.5" />
                                      我写的
                                    </Badge>
                                  </Link>
                                )}
                              </div>
                              <p className="text-[13px] text-[#1a3a5c] mt-1">{item.title}</p>
                              {"detail" in item && item.detail && (
                                <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">
                                  {item.detail}
                                </p>
                              )}
                              {/* 评语维度标签 */}
                              {"dimensions" in item && item.dimensions && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {(() => {
                                    try {
                                      const dims = JSON.parse(item.dimensions as string);
                                      return Object.entries(dims).map(([dim, val]: [string, any]) => (
                                        <Badge
                                          key={dim}
                                          variant="outline"
                                          className="text-[10px] h-5"
                                        >
                                          {dim}: {val}
                                        </Badge>
                                      ));
                                    } catch {
                                      return null;
                                    }
                                  })()}
                                </div>
                              )}
                              {"status" in item && item.status && (
                                <Badge
                                  className={`text-[10px] mt-1 h-5 ${
                                    item.status === "APPROVED"
                                      ? "bg-green-100 text-green-700 border-green-200"
                                      : item.status === "PENDING"
                                      ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                      : "bg-red-100 text-red-700 border-red-200"
                                  }`}
                                >
                                  {item.status === "APPROVED"
                                    ? "已通过"
                                    : item.status === "PENDING"
                                    ? "待审核"
                                    : "已拒绝"}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* 成绩趋势 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] text-[#1a3a5c]">成绩趋势</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(scoresBySubject).length === 0 ? (
                <p className="text-sm text-slate-400">暂无成绩记录</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(scoresBySubject).map(([subject, subjectScores]) => (
                    <div key={subject}>
                      <h4 className="text-sm font-medium text-[#1a3a5c] mb-2">{subject}</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-slate-400">
                              <th className="text-left py-1.5 px-2 text-[11px]">考试</th>
                              <th className="text-center py-1.5 px-2 text-[11px]">分数</th>
                              <th className="text-center py-1.5 px-2 text-[11px]">满分</th>
                              <th className="text-center py-1.5 px-2 text-[11px]">班排</th>
                              <th className="text-center py-1.5 px-2 text-[11px]">年排</th>
                              <th className="text-center py-1.5 px-2 text-[11px]">日期</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subjectScores.slice(0, 5).map((s) => (
                              <tr key={s.id} className="border-b border-slate-50">
                                <td className="py-1.5 px-2 text-[12px]">{s.examType || "考试"}</td>
                                <td className="py-1.5 px-2 text-center text-[12px] font-medium">
                                  {s.score}
                                </td>
                                <td className="py-1.5 px-2 text-center text-[12px] text-slate-400">
                                  {s.total}
                                </td>
                                <td className="py-1.5 px-2 text-center text-[12px] text-slate-500">
                                  {s.classRank || "-"}
                                </td>
                                <td className="py-1.5 px-2 text-center text-[12px] text-slate-500">
                                  {s.gradeRank || "-"}
                                </td>
                                <td className="py-1.5 px-2 text-center text-[11px] text-slate-400">
                                  {s.examDate.toLocaleDateString("zh-CN")}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：各模块卡片 */}
        <div className="space-y-5">
          {/* 均衡度卡片 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] text-[#1a3a5c]">均衡发展</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <div
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 mb-2"
                  style={{ borderColor: balanceStatus.color }}
                >
                  <span className="text-2xl font-bold" style={{ color: balanceStatus.color }}>
                    {balance}
                  </span>
                </div>
                <p className="text-sm font-medium" style={{ color: balanceStatus.color }}>
                  {balanceStatus.status}
                </p>
                <p className="text-xs text-slate-400 mt-1">{balanceStatus.description}</p>
              </div>
              <div className="space-y-2">
                {sortedDims.map((dim) => {
                  const detail = sixDimData.current[dim.key];
                  const pct = Math.round((detail.score / (detail.benchmark + 60)) * 100);
                  return (
                    <div key={dim.key} className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-8">{dim.key}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: dim.color,
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 教师评语历史 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] text-[#1a3a5c]">
                教师评语 ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[400px] overflow-y-auto">
              {comments.length === 0 ? (
                <p className="text-sm text-slate-400">暂无评语</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg bg-slate-50">
                    <p className="text-[13px] text-[#1a3a5c] line-clamp-3">{c.content}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[11px] text-slate-400">
                        {c.teacher.name} · {c.createdAt.toLocaleDateString("zh-CN")}
                      </p>
                      {/* 当前教师可以编辑自己写的评语 */}
                      {c.teacherId === teacherId && (
                        <Link href={`/t/comments?studentId=${studentId}&edit=${c.id}`}>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] gap-1">
                            <Edit3 className="h-3 w-3" />
                            编辑
                          </Button>
                        </Link>
                      )}
                    </div>
                    {/* 评语维度标签 */}
                    {c.dimensions && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(() => {
                          try {
                            const dims = JSON.parse(c.dimensions);
                            return Object.entries(dims).map(([dim, val]: [string, any]) => (
                              <Badge
                                key={dim}
                                variant="outline"
                                className="text-[10px] h-5"
                              >
                                {dim}: {val}
                              </Badge>
                            ));
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 心情日记摘要 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[15px] text-[#1a3a5c]">心情日记摘要</CardTitle>
                {!canViewMood && (
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {moodEntries.length === 0 ? (
                <p className="text-sm text-slate-400">暂无心情记录</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-slate-50">
                      <p className="text-lg font-bold text-[#1a3a5c]">{moodStats.total}</p>
                      <p className="text-[10px] text-slate-400">记录次数</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50">
                      <p className="text-lg font-bold text-[#1a3a5c]">{moodStats.avgRating}</p>
                      <p className="text-[10px] text-slate-400">平均评分</p>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50">
                      <p className="text-lg font-bold text-[#1a3a5c]">
                        {moodStats.trend !== null ? (
                          moodStats.trend > 0 ? (
                            <TrendingUp className="h-5 w-5 text-green-600 mx-auto" />
                          ) : moodStats.trend < 0 ? (
                            <TrendingDown className="h-5 w-5 text-red-600 mx-auto" />
                          ) : (
                            <Minus className="h-5 w-5 text-slate-400 mx-auto" />
                          )
                        ) : (
                          <Minus className="h-5 w-5 text-slate-400 mx-auto" />
                        )}
                      </p>
                      <p className="text-[10px] text-slate-400">近期趋势</p>
                    </div>
                  </div>

                  {/* 心理老师可见具体内容 */}
                  {canViewMood ? (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {moodEntries.slice(0, 10).map((entry) => (
                        <div key={entry.id} className="p-2 rounded-lg bg-slate-50 text-[12px]">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">
                              {entry.date.toLocaleDateString("zh-CN")}
                            </span>
                            <span className="text-amber-500">
                              {"★".repeat(entry.rating)}
                              {"☆".repeat(5 - entry.rating)}
                            </span>
                          </div>
                          {entry.note && (
                            <p className="text-slate-600 mt-1 line-clamp-2">{entry.note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                      <Shield className="h-4 w-4 text-amber-600 shrink-0" />
                      <p className="text-[11px] text-amber-700">
                        心情日记具体内容仅心理老师可见
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 心理测评摘要 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[15px] text-[#1a3a5c]">心理测评摘要</CardTitle>
                {!canViewPsych && (
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {assessments.length === 0 ? (
                <p className="text-sm text-slate-400">暂无测评记录</p>
              ) : (
                <div className="space-y-3">
                  {assessments.map((a) => (
                    <div key={a.id} className="p-3 rounded-lg bg-slate-50">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-[#1a3a5c]">
                          {a.scaleName}
                        </span>
                        {a.riskLevel && (
                          <Badge
                            className={`text-[10px] h-5 ${
                              a.riskLevel === "HIGH"
                                ? "bg-red-100 text-red-700 border-red-200"
                                : a.riskLevel === "MEDIUM"
                                ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                : "bg-green-100 text-green-700 border-green-200"
                            }`}
                          >
                            {a.riskLevel === "HIGH"
                              ? "高风险"
                              : a.riskLevel === "MEDIUM"
                              ? "中风险"
                              : "低风险"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {a.createdAt.toLocaleDateString("zh-CN")} · {a.semester}
                      </p>

                      {/* 心理老师可见详情 */}
                      {canViewPsych ? (
                        <div className="mt-2">
                          {a.score !== null && (
                            <p className="text-[12px] text-slate-600">
                              得分：{a.score.toFixed(1)}
                            </p>
                          )}
                          {a.resultJson && (
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-3">
                              {(() => {
                                try {
                                  const result = JSON.parse(a.resultJson);
                                  return result.summary || JSON.stringify(result).slice(0, 100);
                                } catch {
                                  return a.resultJson.slice(0, 100);
                                }
                              })()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-2 p-2 rounded bg-amber-50 border border-amber-200">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <p className="text-[11px] text-amber-700">
                            测评详情仅心理老师可见
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 里程碑 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] text-[#1a3a5c]">
                <Trophy className="h-4 w-4 inline mr-1" />
                里程碑 ({milestones.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
              {milestones.length === 0 ? (
                <p className="text-sm text-slate-400">暂无里程碑</p>
              ) : (
                milestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        m.status === "APPROVED"
                          ? "bg-green-500"
                          : m.status === "PENDING"
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-[#1a3a5c] truncate">{m.title}</p>
                      <p className="text-[11px] text-slate-400">
                        {m.occurredAt.toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                    <Badge
                      className={`text-[10px] shrink-0 h-5 ${
                        m.status === "APPROVED"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : m.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                          : "bg-red-100 text-red-700 border-red-200"
                      }`}
                    >
                      {m.status === "APPROVED" ? "已通过" : m.status === "PENDING" ? "待审核" : "已拒绝"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 活动记录 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] text-[#1a3a5c]">
                <School className="h-4 w-4 inline mr-1" />
                活动记录 ({activities.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
              {activities.length === 0 ? (
                <p className="text-sm text-slate-400">暂无活动记录</p>
              ) : (
                activities.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                    <div className="min-w-0">
                      <p className="text-[13px] text-[#1a3a5c] truncate">{a.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {a.startDate.toLocaleDateString("zh-CN")} · {a.role || "参与者"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[11px] shrink-0 border-yellow-200 text-yellow-700 bg-yellow-50"
                    >
                      +{a.points}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 综合统计 */}
          <Card className="border-0 shadow-sm bg-[#1a3a5c] text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px]">综合统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "考试记录", value: scores.length },
                  { label: "教师评语", value: comments.length },
                  { label: "里程碑", value: milestones.length },
                  { label: "活动积分", value: activities.reduce((sum, a) => sum + a.points, 0) },
                ].map((stat) => (
                  <div key={stat.label} className="text-center p-2 rounded-lg bg-white/10">
                    <p className="text-lg font-bold">{stat.value}</p>
                    <p className="text-[11px] text-white/70">{stat.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
