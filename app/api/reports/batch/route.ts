import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGradeBenchmark } from "@/lib/dimension-utils";

// POST - 批量生成报告 + 班级周报
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (
    !session?.user ||
    (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")
  ) {
    return Response.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { classId, semester = "2024-2025-1" } = body;

    if (!classId) {
      return Response.json({ error: "缺少 classId" }, { status: 400 });
    }

    // 获取班级所有学生
    const students = await prisma.student.findMany({
      where: { classId, status: "ENROLLED" },
      include: {
        class: { include: { grade: true } },
        careerProfile: true,
        moodEntries: {
          where: {
            date: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 最近7天
            },
          },
          select: { rating: true, date: true },
        },
      },
      orderBy: { name: "asc" },
    });

    if (students.length === 0) {
      return Response.json({ error: "班级没有学生" }, { status: 404 });
    }

    // 计算班级周报数据
    const weeklyData = await calculateWeeklyData(students, classId, semester);

    // 批量生成每个学生的报告
    const reports = [];
    for (const student of students) {
      // 获取最近3条评语
      const comments = await prisma.comment.findMany({
        where: { studentId: student.id },
        include: { teacher: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 3,
      });

      // 获取本学期里程碑
      const semesterStart = getSemesterStart(semester);
      const semesterEnd = getSemesterEnd(semester);
      const milestones = await prisma.milestone.findMany({
        where: {
          studentId: student.id,
          status: "APPROVED",
          occurredAt: { gte: semesterStart, lte: semesterEnd },
        },
        orderBy: { occurredAt: "desc" },
        take: 10,
      });

      // 获取本学期活动
      const activities = await prisma.activity.findMany({
        where: {
          studentId: student.id,
          status: "APPROVED",
          startDate: { gte: semesterStart, lte: semesterEnd },
        },
        orderBy: { startDate: "desc" },
        take: 10,
      });

      // 获取本学期心情统计
      const moodEntries = await prisma.moodEntry.findMany({
        where: {
          studentId: student.id,
          date: { gte: semesterStart, lte: semesterEnd },
        },
        select: { rating: true },
      });

      // 解析六维数据
      let currentDimensions: Record<string, number> = {};
      let previousDimensions: Record<string, number> = {};
      if (student.careerProfile?.sixDimensions) {
        try {
          currentDimensions = JSON.parse(student.careerProfile.sixDimensions);
        } catch {
          currentDimensions = {};
        }
      }
      if (student.careerProfile?.dimensionHistory) {
        try {
          const history = JSON.parse(student.careerProfile.dimensionHistory);
          if (Array.isArray(history) && history.length > 0) {
            previousDimensions = history[history.length - 1];
          }
        } catch {
          previousDimensions = {};
        }
      }

      const gradeName = student.class?.grade?.name || "高一";
      const benchmark = getGradeBenchmark(gradeName);

      const dimensions = ["逻辑", "创新", "表达", "才情", "身心", "德行"].map(
        (name) => {
          const score = currentDimensions[name] || benchmark;
          const prevScore = previousDimensions[name] || score;
          const change = Math.round((score - prevScore) * 10) / 10;
          return { name, score: Math.round(score), change };
        }
      );

      reports.push({
        studentId: student.id,
        studentName: student.name,
        dimensions,
        comments: comments.map((c) => ({
          id: c.id,
          content: c.content,
          teacherName: c.teacher?.name || "教师",
          createdAt: c.createdAt.toISOString(),
        })),
        milestones: milestones.map((m) => ({
          id: m.id,
          title: m.title,
          type: m.type,
          occurredAt: m.occurredAt.toISOString(),
        })),
        activities: activities.map((a) => ({
          id: a.id,
          name: a.name,
          category: a.category,
          role: a.role,
        })),
        moodStats: {
          recordCount: moodEntries.length,
          avgRating:
            moodEntries.length > 0
              ? Math.round(
                  (moodEntries.reduce((sum, m) => sum + m.rating, 0) /
                    moodEntries.length) *
                    10
                ) / 10
              : 0,
        },
        generatedAt: new Date().toISOString(),
        semester,
      });
    }

    return Response.json({
      reports,
      weeklyData,
      totalCount: reports.length,
    });
  } catch (error) {
    console.error("批量生成报告错误:", error);
    return Response.json({ error: "生成失败" }, { status: 500 });
  }
}

// ==================== 班级周报计算 ====================

async function calculateWeeklyData(
  students: Array<{
    id: string;
    name: string;
    careerProfile: { sixDimensions: string | null; dimensionHistory: string | null } | null;
    moodEntries: Array<{ rating: number; date: Date }>;
  }>,
  classId: string,
  semester: string
) {
  // 1. 六维变化：计算班级每个维度的平均变化
  const dimensionChanges = ["逻辑", "创新", "表达", "才情", "身心", "德行"].map(
    (name) => {
      let totalChange = 0;
      let count = 0;

      for (const student of students) {
        let current = 0;
        let previous = 0;
        if (student.careerProfile?.sixDimensions) {
          try {
            const dims = JSON.parse(student.careerProfile.sixDimensions);
            current = dims[name] || 0;
          } catch {
            current = 0;
          }
        }
        if (student.careerProfile?.dimensionHistory) {
          try {
            const history = JSON.parse(student.careerProfile.dimensionHistory);
            if (Array.isArray(history) && history.length > 0) {
              previous = history[history.length - 1][name] || current;
            }
          } catch {
            previous = current;
          }
        }
        if (current > 0) {
          totalChange += current - previous;
          count++;
        }
      }

      return {
        name,
        avgChange: count > 0 ? Math.round((totalChange / count) * 10) / 10 : 0,
      };
    }
  );

  // 2. 本周新增里程碑
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const newMilestones = await prisma.milestone.count({
    where: {
      studentId: { in: students.map((s) => s.id) },
      status: "APPROVED",
      occurredAt: { gte: weekAgo },
    },
  });

  // 3. 心情趋势（本周 vs 上周）
  let moodUp = 0;
  let moodStable = 0;
  let moodDown = 0;

  for (const student of students) {
    const thisWeek = student.moodEntries.filter(
      (m) => m.date >= weekAgo
    );
    const lastWeek = student.moodEntries.filter(
      (m) => {
        const d = new Date(m.date);
        return d >= new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000) && d < weekAgo;
      }
    );

    const thisAvg =
      thisWeek.length > 0
        ? thisWeek.reduce((sum, m) => sum + m.rating, 0) / thisWeek.length
        : 0;
    const lastAvg =
      lastWeek.length > 0
        ? lastWeek.reduce((sum, m) => sum + m.rating, 0) / lastWeek.length
        : 0;

    if (thisAvg === 0 || lastAvg === 0) {
      moodStable++;
    } else if (thisAvg > lastAvg + 0.3) {
      moodUp++;
    } else if (thisAvg < lastAvg - 0.3) {
      moodDown++;
    } else {
      moodStable++;
    }
  }

  // 4. 预警动态
  const warnings = await prisma.warning.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
    },
    select: { createdAt: true },
  });
  const totalWarnings = warnings.length;
  const newWarnings = warnings.filter((w) => w.createdAt >= weekAgo).length;

  // 5. 亮点学生（六维总分进步最大的3名学生）
  const studentProgress = students
    .map((s) => {
      let currentTotal = 0;
      let previousTotal = 0;
      if (s.careerProfile?.sixDimensions) {
        try {
          const dims = JSON.parse(s.careerProfile.sixDimensions);
          currentTotal = Object.values(dims).reduce(
            (sum: number, v: unknown) => sum + (typeof v === "number" ? v : 0),
            0
          );
        } catch {
          currentTotal = 0;
        }
      }
      if (s.careerProfile?.dimensionHistory) {
        try {
          const history = JSON.parse(s.careerProfile.dimensionHistory);
          if (Array.isArray(history) && history.length > 0) {
            previousTotal = Object.values(history[history.length - 1]).reduce(
              (sum: number, v: unknown) => sum + (typeof v === "number" ? v : 0),
              0
            );
          }
        } catch {
          previousTotal = currentTotal;
        }
      }
      return {
        name: s.name,
        progress: currentTotal - previousTotal,
      };
    })
    .filter((s) => s.progress > 0)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5);

  const highlightStudents = studentProgress.map((s) => ({
    name: s.name,
    reason: `六维总分进步 +${Math.round(s.progress)}分`,
  }));

  return {
    dimensionChanges,
    newMilestones,
    moodTrend: { up: moodUp, stable: moodStable, down: moodDown },
    warnings: { count: totalWarnings, newCount: newWarnings },
    highlightStudents,
  };
}

// ==================== 工具函数 ====================

function getSemesterStart(semester: string): Date {
  const parts = semester.split("-");
  if (parts.length >= 3) {
    const term = parts[2];
    const year = parseInt(parts[0], 10);
    if (term === "1") {
      return new Date(year, 8, 1);
    } else {
      return new Date(year + 1, 1, 1);
    }
  }
  const now = new Date();
  const year = now.getFullYear();
  if (now.getMonth() >= 8) {
    return new Date(year, 8, 1);
  } else {
    return new Date(year - 1, 8, 1);
  }
}

function getSemesterEnd(semester: string): Date {
  const parts = semester.split("-");
  if (parts.length >= 3) {
    const term = parts[2];
    const year = parseInt(parts[0], 10);
    if (term === "1") {
      return new Date(year + 1, 0, 31);
    } else {
      return new Date(year + 1, 6, 31);
    }
  }
  return new Date();
}
