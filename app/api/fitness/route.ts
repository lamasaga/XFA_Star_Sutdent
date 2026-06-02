import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshStudentDimensions } from "@/lib/dimension-calculator";

// GET - 获取体测数据
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (
    !session?.user ||
    (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")
  ) {
    return Response.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const semester = searchParams.get("semester");

    if (!studentId) {
      return Response.json({ error: "缺少 studentId" }, { status: 400 });
    }

    // 体测数据存储为特殊类型的 Assessment 记录
    const assessments = await prisma.assessment.findMany({
      where: {
        studentId,
        type: "PHYSICAL",
        ...(semester ? { semester } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    // 解析 resultJson 中的体测项目数据
    const fitnessRecords = assessments.map((a) => {
      let items: Array<{ name: string; grade: string; score: number }> = [];
      let totalScore = 0;
      let performanceScore = 0;
      try {
        const result = JSON.parse(a.resultJson);
        items = result.items || [];
        totalScore = result.totalScore || 0;
        performanceScore = result.performanceScore || 0;
      } catch {
        // 忽略解析错误
      }
      return {
        id: a.id,
        studentId: a.studentId,
        semester: a.semester,
        items,
        totalScore,
        performanceScore,
        createdAt: a.createdAt.toISOString(),
      };
    });

    return Response.json({ records: fitnessRecords });
  } catch (error) {
    console.error("获取体测数据错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST - 保存体测数据
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
    const { data, semester = "2024-2025-1" } = body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return Response.json({ error: "缺少体测数据" }, { status: 400 });
    }

    const createdRecords = [];
    const affectedStudentIds: string[] = [];

    for (const entry of data) {
      const { studentId, items, totalScore, performanceScore } = entry;

      if (!studentId || !items || !Array.isArray(items)) {
        continue;
      }

      // 将体测数据保存为 Assessment 记录，type = "PHYSICAL"
      // scaleName 存储项目名称列表，score 存储总分
      const scaleName = items.map((i: { name: string }) => i.name).join(", ");
      const scaleCode = "PHYSICAL_TEST";

      const assessment = await prisma.assessment.create({
        data: {
          studentId,
          type: "PHYSICAL",
          scaleName,
          scaleCode,
          resultJson: JSON.stringify({
            items,
            totalScore,
            performanceScore,
            maxScore: 48,
          }),
          score: totalScore,
          semester,
          visibleToStudent: true,
          visibleToParent: true,
        },
      });

      createdRecords.push(assessment);
      affectedStudentIds.push(studentId);
    }

    // 异步触发六维重算（身心维度）
    const uniqueStudentIds = [...new Set(affectedStudentIds)];
    Promise.allSettled(
      uniqueStudentIds.map((studentId) =>
        refreshStudentDimensions(studentId).catch((err) => {
          console.error(`重算学生 ${studentId} 六维分数失败:`, err);
        })
      )
    );

    return Response.json({
      success: true,
      count: createdRecords.length,
      message: `成功保存 ${createdRecords.length} 条体测记录`,
    });
  } catch (error) {
    console.error("保存体测数据错误:", error);
    return Response.json({ error: "保存失败" }, { status: 500 });
  }
}
