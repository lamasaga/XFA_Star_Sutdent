import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGradeLevelByGraduationYear } from "@/lib/grade-utils";

/**
 * POST - 自动升级学生年级/班级
 *
 * 根据 graduationYear（毕业年份）计算学生当前应该所在的年级，
 * 然后将学生切换到对应年级+同名班级。
 *
 * 规则：
 * - 2028级（2028年毕业）
 *   - 2025年9月~2026年8月 = 高一
 *   - 2026年9月~2027年8月 = 高二
 *   - 2027年9月~2028年6月 = 高三
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { dryRun = true, graduationYear: targetGraduationYear } = body;

    // 获取所有在读学生
    const students = await prisma.student.findMany({
      where: {
        status: "ENROLLED",
        ...(targetGraduationYear ? { graduationYear: targetGraduationYear } : {}),
      },
      include: {
        class: { include: { grade: true } },
      },
      orderBy: { studentNo: "asc" },
    });

    // 获取所有班级用于匹配
    const allClasses = await prisma.class.findMany({
      include: { grade: true },
    });

    // 构建班级查找索引：grade.level + class.name -> classId
    const classIndex = new Map<string, string>();
    for (const c of allClasses) {
      classIndex.set(`${c.grade.level}-${c.name}`, c.id);
    }

    const upgrades: Array<{
      studentId: string;
      name: string;
      studentNo: string;
      fromClass: string;
      toClass: string;
      graduationYear: number;
      currentGradeLevel: number;
      targetGradeLevel: number;
    }> = [];

    const errors: Array<{ studentId: string; name: string; error: string }> = [];

    for (const student of students) {
      const gradeInfo = getGradeLevelByGraduationYear(student.graduationYear);
      const currentGradeLevel = student.class.grade.level;

      // 如果当前年级已经正确，跳过
      if (currentGradeLevel === gradeInfo.level) {
        continue;
      }

      // 查找目标班级（同名班级的更高年级版本）
      const targetClassId = classIndex.get(`${gradeInfo.level}-${student.class.name}`);

      if (!targetClassId) {
        errors.push({
          studentId: student.id,
          name: student.name,
          error: `未找到对应班级: ${gradeInfo.name}${student.class.name}`,
        });
        continue;
      }

      const targetClass = allClasses.find((c) => c.id === targetClassId);

      upgrades.push({
        studentId: student.id,
        name: student.name,
        studentNo: student.studentNo,
        fromClass: `${student.class.grade.name}${student.class.name}`,
        toClass: `${targetClass?.grade.name}${targetClass?.name}`,
        graduationYear: student.graduationYear,
        currentGradeLevel,
        targetGradeLevel: gradeInfo.level,
        targetClassId,
      });
    }

    // 批量执行升级（事务保护）
    if (!dryRun && upgrades.length > 0) {
      await prisma.$transaction(
        upgrades.map((u) =>
          prisma.student.update({
            where: { id: u.studentId },
            data: { classId: u.targetClassId },
          })
        )
      );
    }
    }

    return Response.json({
      dryRun,
      totalStudents: students.length,
      upgraded: upgrades.length,
      errors: errors.length,
      upgrades,
      errorDetails: errors,
    });
  } catch (error) {
    console.error("自动升级错误:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "升级失败" },
      { status: 500 }
    );
  }
}

/**
 * GET - 获取当前年级分布统计
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const students = await prisma.student.findMany({
      where: { status: "ENROLLED" },
      include: { class: { include: { grade: true } } },
    });

    const stats: Record<string, { count: number; graduationYears: number[] }> = {};

    for (const s of students) {
      const gradeInfo = getGradeLevelByGraduationYear(s.graduationYear);
      const key = `${gradeInfo.name}(${gradeInfo.level})`;

      if (!stats[key]) {
        stats[key] = { count: 0, graduationYears: [] };
      }
      stats[key].count++;
      if (!stats[key].graduationYears.includes(s.graduationYear)) {
        stats[key].graduationYears.push(s.graduationYear);
      }
    }

    // 按 graduationYear 分组统计
    const yearStats: Record<number, { count: number; currentGrade: string }> = {};
    for (const s of students) {
      const info = getGradeLevelByGraduationYear(s.graduationYear);
      if (!yearStats[s.graduationYear]) {
        yearStats[s.graduationYear] = { count: 0, currentGrade: info.name };
      }
      yearStats[s.graduationYear].count++;
    }

    return Response.json({
      byGrade: stats,
      byGraduationYear: yearStats,
      currentAcademicYear: getCurrentAcademicYear(),
    });
  } catch (error) {
    console.error("获取年级统计错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}

function getCurrentAcademicYear(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 8 ? year : year - 1;
}
