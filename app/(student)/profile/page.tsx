import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FiveDimensionRadar } from "@/components/radar-chart";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const DIMENSION_KEYS = ["学业", "心理", "职业", "社交", "特长"] as const;

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

  // 使用聚合查询（与 /api/students/me/profile 保持一致）
  const [student, classmatesProfiles, comments, milestones, activities, scores] =
    await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        include: {
          class: { include: { grade: true } },
          careerProfile: true,
          user: { select: { email: true, avatar: true } },
        },
      }),
      prisma.careerProfile.findMany({
        where: {
          student: {
            classId: (
              await prisma.student.findUnique({
                where: { id: studentId },
                select: { classId: true },
              })
            )?.classId,
          },
          studentId: { not: studentId },
        },
        select: { fiveDimensions: true },
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

  // 解析五维数据
  let dimensions: Record<string, number> = {};
  if (student.careerProfile?.fiveDimensions) {
    try {
      dimensions = JSON.parse(student.careerProfile.fiveDimensions);
    } catch {
      dimensions = {};
    }
  }

  // 班级平均分
  const classAverage: Record<string, number> = {};
  const dimensionScores: Record<string, number[]> = {
    学业: [], 心理: [], 职业: [], 社交: [], 特长: [],
  };

  for (const profile of classmatesProfiles) {
    if (!profile.fiveDimensions) continue;
    try {
      const dims = JSON.parse(profile.fiveDimensions) as Record<string, number>;
      for (const key of DIMENSION_KEYS) {
        if (typeof dims[key] === "number") dimensionScores[key].push(dims[key]);
      }
    } catch {}
  }

  for (const key of DIMENSION_KEYS) {
    const values = dimensionScores[key];
    classAverage[key] =
      values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 50;
  }

  const radarData = DIMENSION_KEYS.map((key) => ({
    dimension: key,
    score: dimensions[key] || 0,
    average: classAverage[key] || 50,
  }));

  const sortedDims = [...radarData].sort((a, b) => b.score - a.score);
  const strongest = sortedDims[0];
  const weakest = sortedDims[sortedDims.length - 1];

  // 统计
  const subjects = [...new Set(scores.map((s) => s.subject))];
  const totalPoints = activities.reduce((sum, a) => sum + a.points, 0);

  // 时间线数据（全部记录按时间合并）
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
      {/* 标题 */}
      <div>
        <h1 className="text-lg font-bold text-[#1a3a5c]">成长档案</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {student.name} · {student.class?.grade?.name} · {student.class?.name}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 左侧：五维雷达 + 时间线 */}
        <div className="lg:col-span-2 space-y-5">
          {/* 五维雷达 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[15px] text-[#1a3a5c]">五维成长雷达</CardTitle>
                  <CardDescription className="text-xs text-slate-400 mt-0.5">
                    个人得分 vs 班级平均（满分100）
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FiveDimensionRadar data={radarData} showAverage={true} height={280} />
                <div className="space-y-3">
                  {radarData.map((d) => (
                    <div key={d.dimension}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-medium text-[#1a3a5c]">{d.dimension}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-[#1a3a5c]">{d.score}</span>
                          <span className="text-[11px] text-slate-400">班均 {d.average}</span>
                        </div>
                      </div>
                      <Progress value={d.score} max={100} className="h-1.5 mb-1" />
                      <p className="text-[11px] text-slate-400">
                        {getDimensionInsight(d.score, d.average, d.dimension)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-100">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-[11px] text-green-700 font-semibold mb-1">优势维度</p>
                  <p className="text-[13px] text-[#1a3a5c] font-medium">
                    {strongest.dimension} · {strongest.score}分
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-[11px] text-blue-700 font-semibold mb-1">建议提升</p>
                  <p className="text-[13px] text-[#1a3a5c] font-medium">
                    {weakest.dimension} · {weakest.score}分
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

        {/* 右侧：各模块独立卡片 */}
        <div className="space-y-5">
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
                    <Badge variant="outline" className="text-[11px] shrink-0 border-yellow-200 text-yellow-700 bg-yellow-50">
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
