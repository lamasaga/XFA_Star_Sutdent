import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGradeBenchmark, getDimensionLabel } from "@/lib/dimension-utils";
import type { DimensionKey } from "@/lib/dimension-utils";

// POST - 生成单个学生报告
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
    const { studentId, semester = "2024-2025-1" } = body;

    if (!studentId) {
      return Response.json({ error: "缺少 studentId" }, { status: 400 });
    }

    // 获取学生基本信息和六维数据
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: { include: { grade: true } },
        careerProfile: true,
      },
    });

    if (!student) {
      return Response.json({ error: "学生不存在" }, { status: 404 });
    }

    // 获取当前六维分数
    let currentDimensions: Record<string, number> = {};
    if (student.careerProfile?.sixDimensions) {
      try {
        currentDimensions = JSON.parse(student.careerProfile.sixDimensions);
      } catch {
        currentDimensions = {};
      }
    }

    // 获取历史变化（从 dimensionHistory）
    let previousDimensions: Record<string, number> = {};
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

    // 构建六维数据
    const dimensions = ["逻辑", "创新", "表达", "才情", "身心", "德行"].map(
      (name) => {
        const score = currentDimensions[name] || benchmark;
        const prevScore = previousDimensions[name] || score;
        const change = Math.round((score - prevScore) * 10) / 10;
        return {
          name,
          score: Math.round(score),
          change,
          label: getDimensionLabel(score, benchmark).label,
        };
      }
    );

    // 获取最近3条评语
    const comments = await prisma.comment.findMany({
      where: { studentId },
      include: {
        teacher: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });

    // 获取本学期里程碑
    const semesterStart = getSemesterStart(semester);
    const semesterEnd = getSemesterEnd(semester);
    const milestones = await prisma.milestone.findMany({
      where: {
        studentId,
        status: "APPROVED",
        occurredAt: {
          gte: semesterStart,
          lte: semesterEnd,
        },
      },
      orderBy: { occurredAt: "desc" },
      take: 10,
    });

    // 获取本学期活动记录
    const activities = await prisma.activity.findMany({
      where: {
        studentId,
        status: "APPROVED",
        startDate: {
          gte: semesterStart,
          lte: semesterEnd,
        },
      },
      orderBy: { startDate: "desc" },
      take: 10,
    });

    // 获取心情统计（仅统计信息，不含具体内容）
    const moodEntries = await prisma.moodEntry.findMany({
      where: {
        studentId,
        date: {
          gte: semesterStart,
          lte: semesterEnd,
        },
      },
      select: { rating: true },
    });

    const moodStats = {
      recordCount: moodEntries.length,
      avgRating:
        moodEntries.length > 0
          ? Math.round(
              (moodEntries.reduce((sum, m) => sum + m.rating, 0) /
                moodEntries.length) *
                10
            ) / 10
          : 0,
    };

    const report = {
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
      moodStats,
      generatedAt: new Date().toISOString(),
      semester,
    };

    return Response.json(report);
  } catch (error) {
    console.error("生成报告错误:", error);
    return Response.json({ error: "生成失败" }, { status: 500 });
  }
}

// ==================== 工具函数 ====================

function getSemesterStart(semester: string): Date {
  // semester 格式: "2024-2025-1" 或 "2024-2025-2"
  const parts = semester.split("-");
  if (parts.length >= 3) {
    const term = parts[2]; // "1" 或 "2"
    const year = parseInt(parts[0], 10);
    if (term === "1") {
      // 第一学期：9月1日开始
      return new Date(year, 8, 1); // month 0-based, 8 = September
    } else {
      // 第二学期：2月1日开始
      return new Date(year + 1, 1, 1); // 1 = February
    }
  }
  // 默认返回本学年开始
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
      // 第一学期：次年1月31日结束
      return new Date(year + 1, 0, 31);
    } else {
      // 第二学期：7月31日结束
      return new Date(year + 1, 6, 31);
    }
  }
  return new Date();
}
