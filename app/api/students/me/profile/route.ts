import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DIMENSION_KEYS = ["学业", "心理", "职业", "社交", "特长"] as const;

// GET /api/students/me/profile
// 聚合档案接口：一次请求返回全部档案数据
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.studentId) {
    return Response.json({ error: "未登录或非学生用户" }, { status: 401 });
  }

  const studentId = session.user.studentId;

  try {
    const [student, classmatesProfiles, comments, milestones, activities, scores] =
      await Promise.all([
        // 1. 学生基本信息
        prisma.student.findUnique({
          where: { id: studentId },
          include: {
            class: { include: { grade: true } },
            careerProfile: true,
            user: { select: { email: true, avatar: true } },
          },
        }),

        // 2. 同班同学五维数据（用于计算班级平均）
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

        // 3. 全部教师评语
        prisma.comment.findMany({
          where: { studentId },
          orderBy: { createdAt: "desc" },
          include: {
            teacher: { select: { name: true, title: true } },
          },
        }),

        // 4. 全部里程碑
        prisma.milestone.findMany({
          where: { studentId },
          orderBy: { occurredAt: "desc" },
        }),

        // 5. 全部活动记录
        prisma.activity.findMany({
          where: { studentId },
          orderBy: { startDate: "desc" },
        }),

        // 6. 全部成绩（用于计算摘要）
        prisma.score.findMany({
          where: { studentId },
          orderBy: { examDate: "desc" },
          include: { exam: true },
        }),
      ]);

    if (!student) {
      return Response.json({ error: "未找到学生信息" }, { status: 404 });
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

    // 计算班级平均分
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

    // 成绩摘要
    const subjects = [...new Set(scores.map((s) => s.subject))];
    const avgScoreRate =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + s.score / (s.exam?.fullScore || 100), 0) /
          scores.length
        : 0;

    return Response.json({
      student,
      fiveDimensions: dimensions,
      fiveDimensionsAverage: classAverage,
      comments,
      milestones,
      activities,
      scoreSummary: {
        totalExams: scores.length,
        subjectsCount: subjects.length,
        averageScoreRate: Math.round(avgScoreRate * 100) / 100,
        subjects,
      },
    });
  } catch (error) {
    console.error("获取聚合档案错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}
