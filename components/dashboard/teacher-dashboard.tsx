import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

async function getTeacherData(teacherId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: {
      teacherClasses: {
        include: {
          class: { include: { grade: true, students: true } },
        },
      },
      comments: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!teacher) return null;

  const allStudentIds = teacher.teacherClasses.flatMap((tc) =>
    tc.class.students.map((s) => s.id)
  );

  const warningAssessments = await prisma.assessment.findMany({
    where: {
      studentId: { in: allStudentIds },
      riskLevel: { in: ["WARNING", "WATCH"] },
    },
    include: {
      student: { include: { class: { include: { grade: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weeklyComments = await prisma.comment.count({
    where: { teacherId, createdAt: { gte: weekStart } },
  });

  const recentCommentedStudentIds = await prisma.comment.findMany({
    where: { teacherId, createdAt: { gte: weekStart } },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  const commentedIds = new Set(recentCommentedStudentIds.map((c) => c.studentId));

  const pendingStudents = await prisma.student.findMany({
    where: {
      id: { in: allStudentIds.filter((id) => !commentedIds.has(id)) },
      status: "ENROLLED",
    },
    include: { class: { include: { grade: true } } },
    orderBy: { name: "asc" },
    take: 5,
  });

  return {
    teacher,
    warnings: warningAssessments.filter((a) => a.riskLevel === "WARNING"),
    watches: warningAssessments.filter((a) => a.riskLevel === "WATCH"),
    totalStudents: allStudentIds.length,
    weeklyComments,
    pendingStudents,
  };
}

export async function TeacherDashboard({ teacherId }: { teacherId: string }) {
  const data = await getTeacherData(teacherId);
  if (!data) return <div>未找到教师信息</div>;

  const { teacher, warnings, watches, totalStudents, weeklyComments, pendingStudents } = data;

  const roleLabel =
    teacher.teacherRole === "HOMEROOM"
      ? "班主任"
      : teacher.teacherRole === "PSYCHOLOGY"
      ? "心理老师"
      : teacher.teacherRole === "CAREER"
      ? "职业规划老师"
      : "学科教师";

  return (
    <div className="space-y-6">
      {/* 欢迎区 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a3a5c]">你好，{teacher.name}</h1>
          <p className="text-sm text-[#94a3b8] mt-0.5">
            {roleLabel} · 负责 {totalStudents} 名学生 · {teacher.teacherClasses.length} 个班级
          </p>
        </div>
        <Link href="/t/comments">
          <Button className="bg-gradient-primary hover:opacity-90 text-white shadow-[0_4px_14px_rgba(26,58,92,0.25)]">
            写评语
          </Button>
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "我的学生", value: totalStudents, color: "bg-[#eff6ff] text-[#1a3a5c]" },
          { label: "本周评语", value: weeklyComments, color: "bg-[#f0fdf4] text-[#166534]" },
          { label: "预警学生", value: warnings.length, color: warnings.length > 0 ? "bg-[#fef2f2] text-[#991b1b]" : "bg-[#f0fdf4] text-[#166534]" },
          { label: "负责班级", value: teacher.teacherClasses.length, color: "bg-[#fefce8] text-[#92400e]" },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-card-hover rounded-xl">
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${stat.color.split(" ")[1]}`}>{stat.value}</p>
              <p className="text-[13px] text-[#94a3b8] mt-0.5">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 今日待办 */}
          <Card className="border-0 shadow-card-hover rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#f1f5f9]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[15px] text-[#1a3a5c]">今日待办</CardTitle>
                <Link href="/t/students" className="text-[11px] text-[#4a90d9] hover:underline">查看全部</Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {pendingStudents.length === 0 ? (
                <div className="flex items-center gap-2 text-[#166534] py-4">
                  <p>本周评语已写满，辛苦了！</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#f8fafc] hover:bg-[#e8f0fe] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xs font-bold">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-[#1a3a5c]">{student.name}</p>
                          <p className="text-[11px] text-[#94a3b8]">
                            {student.class.grade.name}{student.class.name} · 学号{student.studentNo}
                          </p>
                        </div>
                      </div>
                      <Link href={`/t/comments?studentId=${student.id}`}>
                        <Button variant="outline" size="sm" className="text-[12px] h-7 border-[#d1d9e6]">
                          写评语
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 心理预警 */}
          <Card className="border-0 shadow-card-hover rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#f1f5f9]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[15px] text-[#1a3a5c]">需关注的学生</CardTitle>
                <Link href="/t/warnings" className="text-[11px] text-[#4a90d9] hover:underline">全部预警</Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {warnings.length === 0 && watches.length === 0 ? (
                <div className="flex items-center gap-2 text-[#166534] py-4">
                  <p>暂无预警学生，一切正常</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {warnings.map((w) => (
                    <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-[#fef2f2] border border-[#fecaca]">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium text-[#1a3a5c]">{w.student.name}</p>
                          <Badge variant="destructive" className="text-[10px] h-5">预警</Badge>
                        </div>
                        <p className="text-[11px] text-[#94a3b8] mt-0.5">
                          {w.student.class?.grade.name}{w.student.class?.name} · {w.scaleName}
                        </p>
                      </div>
                      <Link href="/t/warnings">
                        <Button variant="outline" size="sm" className="text-[12px] h-7">查看</Button>
                      </Link>
                    </div>
                  ))}
                  {watches.map((w) => (
                    <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-[#fefce8] border border-[#fde68a]">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-medium text-[#1a3a5c]">{w.student.name}</p>
                          <Badge variant="secondary" className="text-[10px] h-5">关注</Badge>
                        </div>
                        <p className="text-[11px] text-[#94a3b8] mt-0.5">
                          {w.student.class?.grade.name}{w.student.class?.name} · {w.scaleName}
                        </p>
                      </div>
                      <Link href="/t/warnings">
                        <Button variant="outline" size="sm" className="text-[12px] h-7">查看</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 班级概览 */}
          <Card className="border-0 shadow-card-hover rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#f1f5f9]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[15px] text-[#1a3a5c]">我的班级</CardTitle>
                <Link href="/t/class-profile" className="text-[11px] text-[#4a90d9] hover:underline">班级画像</Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {teacher.teacherClasses.map((tc) => (
                <div key={tc.id} className="flex items-center justify-between p-3 rounded-lg bg-[#f8fafc]">
                  <div>
                    <p className="text-[13px] font-medium text-[#1a3a5c]">
                      {tc.class.grade.name}{tc.class.name}
                      {tc.isHomeroom && <Badge variant="secondary" className="ml-2 text-[10px] h-5">班主任</Badge>}
                    </p>
                    <p className="text-[11px] text-[#94a3b8] mt-0.5">{tc.class.students.length} 名学生</p>
                  </div>
                  <Link href={`/t/students?classId=${tc.classId}`}>
                    <Button variant="outline" size="sm" className="text-[12px] h-7 border-[#d1d9e6]">查看</Button>
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* 右侧 */}
        <div className="space-y-6">
          {/* AI 助手 */}
          <Card className="border-0 shadow-card-hover rounded-xl overflow-hidden bg-gradient-to-br from-[#1a3a5c] to-[#234b73]">
            <CardHeader className="pb-2">
              <CardTitle className="text-[14px] text-white">AI 评语助手</CardTitle>
              <CardDescription className="text-[#94a3b8] text-xs">输入关键词，自动生成评语草稿</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/t/comments">
                <Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20">
                  使用 AI 写评语
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* 最近评语 */}
          <Card className="border-0 shadow-card-hover rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-[#f1f5f9]">
              <CardTitle className="text-[14px] text-[#1a3a5c]">最近评语</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              {teacher.comments.length === 0 ? (
                <p className="text-sm text-[#94a3b8]">暂无评语</p>
              ) : (
                teacher.comments.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-lg bg-[#f8fafc] text-[13px] line-clamp-2">
                    {c.content}
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
