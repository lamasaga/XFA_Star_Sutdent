import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  SixDimensionRadar,
  DimensionDetailCard,
  BalanceBadge,
} from "@/components/radar-chart";
import {
  type RadarChartItem,
  type SixDimensionData,
  mapLegacyToSixDimensions,
  generateDemoDimensionData,
  calculateBalance,
  getBalanceStatus,
  getGradeBenchmark,
  getDimensionLabel,
  getDimensionIcon,
  getDimensionDescription,
  SIX_DIMENSIONS,
  type DimensionKey,
} from "@/lib/dimension-utils";

// ==================== 数据获取与转换 ====================

/**
 * 将数据库数据转换为六维展示数据
 * 兼容旧版五维数据格式
 */
async function getSixDimensionData(studentId: string, gradeName: string): Promise<SixDimensionData> {
  const careerProfile = await prisma.careerProfile.findUnique({
    where: { studentId },
  });

  const benchmark = getGradeBenchmark(gradeName);

  // 尝试解析现有的五维数据
  let legacyDimensions: Record<string, number> = {};
  if (careerProfile?.sixDimensions) {
    try {
      const dims = JSON.parse(careerProfile.sixDimensions);
      if (dims["学业"]) {
        legacyDimensions = dims;
      } else {
        legacyDimensions = dims;
      }
    } catch {
      legacyDimensions = {};
    }
  }

  // 如果存在旧数据，映射到六维；否则使用演示数据
  const hasLegacyData = Object.keys(legacyDimensions).length > 0;

  if (hasLegacyData) {
    // 旧数据映射 + 补充完整结构
    const mappedScores = mapLegacyToSixDimensions(legacyDimensions);
    return buildSixDimensionFromScores(mappedScores, benchmark, gradeName);
  }

  // 无数据时使用演示数据（开发/演示阶段）
  return generateDemoDimensionData(gradeName);
}

/**
 * 从分数构建完整的六维数据（含三层拆分）
 */
function buildSixDimensionFromScores(
  scores: Record<DimensionKey, number>,
  benchmark: number,
  gradeName: string
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
      change: Math.round((Math.random() - 0.3) * 10), // 模拟变化，实际应由历史数据计算
    };
  }

  return {
    current,
    semester: "2025-2026-1",
    gradeName,
  };
}

// ==================== 页面组件 ====================

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.studentId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-slate-400">请先登录</p>
      </div>
    );
  }

  const studentId = session.user.studentId;

  // 并行获取数据
  const [student, comments, milestones, activities, scores] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: { include: { grade: true } },
        user: { select: { email: true, avatar: true } },
      },
    }),
    prisma.comment.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      include: { teacher: { select: { name: true, title: true } } },
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
  ]);

  if (!student) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-slate-400">未找到学生信息</p>
      </div>
    );
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

  // 统计
  const totalPoints = activities.reduce((sum, a) => sum + a.points, 0);

  // 时间线数据
  const timeline = [
    ...scores.map((s) => ({
      type: "成绩" as const,
      date: s.examDate,
      title: `${s.examType || "考试"} · ${s.subject} · ${s.score}分`,
    })),
    ...comments.map((c) => ({
      type: "评语" as const,
      date: c.createdAt,
      title: `${c.teacher.name}：${c.content.slice(0, 40)}${c.content.length > 40 ? "..." : ""}`,
      detail: c.content,
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
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-5">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#1a3a5c]">成长档案</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {student.name} · {student.class?.grade?.name} · {student.class?.name}
          </p>
        </div>
        <BalanceBadge balance={balance} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 左侧：雷达图 + 六维详情 */}
        <div className="lg:col-span-2 space-y-5">
          {/* 六维雷达图 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[15px] text-[#1a3a5c]">六维成长雷达</CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    {sixDimData.semester} · 显示分 = 基准{getGradeBenchmark(gradeName)} + 成长分
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
                                  width: `${Math.min(100, Math.round((detail.score / (detail.benchmark + 60)) * 100))}%`,
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
                  <p className="text-[11px] text-slate-500 mt-0.5">{getDimensionDescription(strongest.key)}</p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-[11px] text-amber-700 font-semibold mb-1">💡 建议关注</p>
                    <p className="text-[13px] text-[#1a3a5c] font-medium">
                    {getDimensionIcon(weakest.key)} {weakest.key} · {sixDimData.current[weakest.key].score}分
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{getDimensionDescription(weakest.key)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 六维详情卡片 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] text-[#1a3a5c]">维度详情</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                点击卡片查看成长分三层拆分（底线/表现/卓越）
              </CardDescription>
            </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {SIX_DIMENSIONS.map((dim) => {
                  const detail = sixDimData.current[dim.key];
                  return (
                      <DimensionDetailCard
                      key={dim.key}
                      dimension={dim.key}
                      score={detail.score}
                      benchmark={detail.benchmark}
                      growth={detail.growth}
                      breakdown={detail.breakdown}
                      label={detail.label}
                      change={detail.change}
                    />
                  );
                })}
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
                              </div>
                                <p className="text-[13px] text-[#1a3a5c] mt-1">{item.title}</p>
                              {"detail" in item && item.detail && (
                                  <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">
                                  {item.detail}
                                </p>
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
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 mb-2">
                    <span className="text-2xl font-bold" style={{ color: balanceStatus.color }}>
                    {balance}
                  </span>
                </div>
                  <p className="text-sm font-medium" style={{ color: balanceStatus.color }}>
                  {balanceStatus.status}
                </p>
                  <p className="text-xs text-slate-400 mt-1">{balanceStatus.description}</p>
              </div>

              {/* 各维度得分条 */}
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

          {/* 教师评语 */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-[15px] text-[#1a3a5c]">
                教师评语 ({comments.length})
              </CardTitle>
            </CardHeader>
              <CardContent className="space-y-3 max-h-[300px] overflow-y-auto">
              {comments.length === 0 ? (
                  <p className="text-sm text-slate-400">暂无评语</p>
              ) : (
                comments.map((c) => (
                    <div key={c.id} className="p-3 rounded-lg bg-slate-50">
                      <p className="text-[13px] text-[#1a3a5c] line-clamp-3">{c.content}</p>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                      {c.teacher.name} · {c.createdAt.toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* 里程碑 */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-[15px] text-[#1a3a5c]">
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
                  { label: "活动积分", value: totalPoints },
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
