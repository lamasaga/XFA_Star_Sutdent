import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getAdminStats() {
  const [totalStudents, totalTeachers, totalClasses, totalComments, totalMilestones, totalActivities, totalAssessments] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.class.count(),
    prisma.comment.count(),
    prisma.milestone.count(),
    prisma.activity.count(),
    prisma.assessment.count(),
  ]);

  return {
    totalStudents,
    totalTeachers,
    totalClasses,
    totalComments,
    totalMilestones,
    totalActivities,
    totalAssessments,
  };
}

export async function AdminDashboard() {
  const stats = await getAdminStats();

  const statCards = [
    { label: "学生总数", value: stats.totalStudents, color: "bg-[#eff6ff] text-[#1a3a5c]", border: "border-[#dbeafe]" },
    { label: "教师总数", value: stats.totalTeachers, color: "bg-[#f0fdf4] text-[#166534]", border: "border-[#dcfce7]" },
    { label: "班级总数", value: stats.totalClasses, color: "bg-[#fefce8] text-[#92400e]", border: "border-[#fde68a]" },
    { label: "评语总数", value: stats.totalComments, color: "bg-[#fdf4ff] text-[#7c3aed]", border: "border-[#e9d5ff]" },
    { label: "里程碑", value: stats.totalMilestones, color: "bg-[#fff7ed] text-[#c2410c]", border: "border-[#fed7aa]" },
    { label: "活动记录", value: stats.totalActivities, color: "bg-[#f0fdfa] text-[#0f766e]", border: "border-[#ccfbf1]" },
    { label: "测评记录", value: stats.totalAssessments, color: "bg-[#eff6ff] text-[#1d4ed8]", border: "border-[#bfdbfe]" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#1a3a5c]">管理控制台</h1>
        <p className="text-sm text-[#94a3b8] mt-0.5">全校数据概览与系统管理</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label} className={`border-0 shadow-card-hover rounded-xl ${card.border} border`}>
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${card.color.split(" ")[1]}`}>{card.value}</p>
              <p className="text-[13px] text-[#94a3b8] mt-0.5">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-card-hover rounded-xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#f1f5f9]">
            <CardTitle className="text-[15px] text-[#1a3a5c]">系统状态</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {[
              { label: "数据库连接", status: "正常", color: "text-[#166534]" },
              { label: "认证服务", status: "正常", color: "text-[#166534]" },
              { label: "AI 服务 (DeepSeek)", status: "未配置", color: "text-[#94a3b8]" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-[13px] text-[#64748b]">{item.label}</span>
                <span className={`text-[13px] font-medium ${item.color}`}>{item.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-card-hover rounded-xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-[#f1f5f9]">
            <CardTitle className="text-[15px] text-[#1a3a5c]">快捷操作</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-[13px] text-[#94a3b8]">请在左侧导航中选择功能模块</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
