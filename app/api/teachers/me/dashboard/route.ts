import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getGradeBenchmark,
  getDimensionLabel,
  SIX_DIMENSIONS,
  type DimensionKey,
} from "@/lib/dimension-utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.teacherId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacherId = session.user.teacherId;

  try {
    // 获取教师信息和关联班级
    const teacherClasses = await prisma.teacherClass.findMany({
      where: { teacherId },
      include: {
        class: {
          include: {
            grade: true,
            students: {
              where: { status: "ENROLLED" },
              include: {
                careerProfile: { select: { sixDimensions: true } },
                moodEntries: {
                  where: {
                    date: {
                      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                  },
                  select: { date: true, rating: true },
                },
              },
            },
          },
        },
      },
    });

    if (teacherClasses.length === 0) {
      return NextResponse.json({
        teacher: { name: session.user.name, role: "TEACHER" },
        classStats: null,
        warnings: [],
        todos: [],
      });
    }

    // 取第一个班级作为默认班级（班主任通常只有一个主班）
    const primaryClass = teacherClasses.find((tc) => tc.isHomeroom)?.class || teacherClasses[0].class;
    const gradeName = primaryClass.grade.name;
    const benchmark = getGradeBenchmark(gradeName);

    // 计算班级六维均值
    const dimensionSums: Record<string, number> = {};
    const dimensionCounts: Record<string, number> = {};
    let totalBalanceSum = 0;
    let moodTotal = 0;
    let moodCount = 0;

    for (const student of primaryClass.students) {
      // 解析六维数据
      let dimensions: Record<string, number> = {};
      if (student.careerProfile?.sixDimensions) {
        try {
          dimensions = JSON.parse(student.careerProfile.sixDimensions);
        } catch {
          dimensions = {};
        }
      }

      // 累加六维分数
      for (const dim of SIX_DIMENSIONS) {
        const score = dimensions[dim.key] || benchmark + 36;
        dimensionSums[dim.key] = (dimensionSums[dim.key] || 0) + score;
        dimensionCounts[dim.key] = (dimensionCounts[dim.key] || 0) + 1;
      }

      // 心情统计
      for (const mood of student.moodEntries) {
        moodTotal += mood.rating;
        moodCount++;
      }
    }

    const avgDimensions: Record<string, number> = {};
    for (const dim of SIX_DIMENSIONS) {
      const count = dimensionCounts[dim.key] || 1;
      avgDimensions[dim.key] = Math.round((dimensionSums[dim.key] || 0) / count);
    }

    const moodAvg = moodCount > 0 ? Math.round((moodTotal / moodCount) * 10) / 10 : 0;

    // 获取预警学生（简化版：基于心情记录和心理测评）
    const warnings = [];

    for (const student of primaryClass.students) {
      // 检查心情记录缺失
      const recentMoodCount = student.moodEntries.filter(
        (m) => m.date >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      ).length;

      if (recentMoodCount === 0 && student.moodEntries.length > 0) {
        warnings.push({
          id: `mood-${student.id}`,
          studentId: student.id,
          studentName: student.name,
          type: "LOW_ENGAGEMENT",
          severity: "LOW",
          description: "连续14天未记录心情",
        });
      }

      // 检查低分维度
      let dimensions: Record<string, number> = {};
      if (student.careerProfile?.sixDimensions) {
        try {
          dimensions = JSON.parse(student.careerProfile.sixDimensions);
        } catch {
          dimensions = {};
        }
      }

      const lowDims = SIX_DIMENSIONS.filter((dim) => {
        const score = dimensions[dim.key] || benchmark + 36;
        return score < benchmark + 39; // 低于底线分+3
      });

      if (lowDims.length > 0) {
        warnings.push({
          id: `low-${student.id}`,
          studentId: student.id,
          studentName: student.name,
          type: "LOW_ENGAGEMENT",
          severity: "MEDIUM",
          description: `${lowDims.map((d) => d.key).join("、")}维度偏低`,
        });
      }
    }

    // 待办清单（简化版）
    const todos = [];

    // 检查未写评语的学生数量
    const commentCount = await prisma.comment.count({
      where: {
        teacherId,
        semester: "2024-2025-1",
      },
    });

    const totalStudents = primaryClass.students.length;
    if (commentCount < totalStudents) {
      todos.push({
        id: "comments",
        text: `写期末评语（还剩 ${totalStudents - commentCount}/${totalStudents} 人）`,
        priority: "high" as const,
        action: "/t/comments",
      });
    }

    // 检查待审核里程碑
    const pendingMilestones = await prisma.milestone.count({
      where: {
        studentId: { in: primaryClass.students.map((s) => s.id) },
        status: "PENDING",
      },
    });

    if (pendingMilestones > 0) {
      todos.push({
        id: "milestones",
        text: `审核里程碑（${pendingMilestones} 条待审核）`,
        priority: "medium" as const,
        action: "/t/review",
      });
    }

    return NextResponse.json({
      teacher: { name: session.user.name, role: session.user.role },
      classStats: {
        studentCount: primaryClass.students.length,
        className: `${gradeName}${primaryClass.name}`,
        avgDimensions,
        benchmark,
        moodAvg,
      },
      warnings: warnings.slice(0, 5), // 最多显示5条
      todos,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
