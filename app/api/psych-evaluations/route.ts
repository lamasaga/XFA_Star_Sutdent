import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshStudentDimensions } from "@/lib/dimension-calculator";

// GET - 获取心理评价列表
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

    const where: Record<string, unknown> = {
      type: { in: ["PSYCHOLOGY", "PSYCH_EVALUATION"] },
    };

    if (studentId) where.studentId = studentId;
    if (semester) where.semester = semester;

    const evaluations = await prisma.assessment.findMany({
      where,
      include: {
        student: {
          select: { name: true, studentNo: true, class: { include: { grade: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // 解析 resultJson 中的标签和备注
    const parsedEvaluations = evaluations.map((e) => {
      let tags: string[] = [];
      let note = "";
      let evalType = "REGULAR";
      try {
        const result = JSON.parse(e.resultJson);
        tags = result.tags || [];
        note = result.note || "";
        evalType = result.evalType || "REGULAR";
      } catch {
        // 忽略解析错误
      }
      return {
        id: e.id,
        studentId: e.studentId,
        studentName: e.student?.name,
        studentNo: e.student?.studentNo,
        className: e.student?.class
          ? `${e.student.class.grade.name}${e.student.class.name}`
          : undefined,
        type: evalType,
        tags,
        note,
        riskLevel: e.riskLevel,
        score: e.score,
        semester: e.semester,
        createdAt: e.createdAt.toISOString(),
      };
    });

    return Response.json({ evaluations: parsedEvaluations });
  } catch (error) {
    console.error("获取心理评价错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST - 保存心理评价
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
    const {
      studentId,
      type = "REGULAR",
      tags,
      note,
      riskLevel = "NORMAL",
      semester = "2024-2025-1",
      notifyHomeroom = false,
    } = body;

    if (!studentId) {
      return Response.json({ error: "缺少 studentId" }, { status: 400 });
    }

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return Response.json({ error: "请至少选择一个标签" }, { status: 400 });
    }

    // 计算心理评价分数（基于标签类型）
    // 正向标签加分，关注/警告标签减分
    const positiveTags = ["情绪稳定", "适应良好"];
    const concernTags = ["焦虑倾向", "社交回避", "注意力分散"];
    const warningTags = ["情绪低落", "行为异常"];

    let score = 50; // 基础分
    for (const tag of tags) {
      if (positiveTags.includes(tag)) score += 10;
      else if (concernTags.includes(tag)) score -= 8;
      else if (warningTags.includes(tag)) score -= 15;
    }
    score = Math.max(0, Math.min(100, score));

    // 根据风险等级调整分数
    const riskScoreMap: Record<string, number> = {
      NORMAL: 70,
      LOW: 55,
      MEDIUM: 40,
      HIGH: 25,
    };
    // 如果风险等级与分数不匹配，以风险等级为准
    const expectedScore = riskScoreMap[riskLevel] || score;
    score = Math.min(score, expectedScore + 10);

    // 保存到 Assessment 表
    const assessment = await prisma.assessment.create({
      data: {
        studentId,
        type: "PSYCH_EVALUATION",
        scaleName: tags.join(", "),
        scaleCode: type,
        resultJson: JSON.stringify({
          tags,
          note,
          evalType: type,
          evaluatorId: session.user.teacherId,
          notifyHomeroom,
        }),
        score,
        riskLevel,
        semester,
        visibleToStudent: riskLevel === "NORMAL" || riskLevel === "LOW",
        visibleToParent: riskLevel === "NORMAL",
      },
    });

    // 如果风险等级为 MEDIUM 或 HIGH，触发心理预警
    if (riskLevel === "MEDIUM" || riskLevel === "HIGH") {
      await prisma.warning.create({
        data: {
          studentId,
          type: "PSYCHOLOGY",
          severity: riskLevel === "HIGH" ? "HIGH" : "MEDIUM",
          description: `心理评价${riskLevel === "HIGH" ? "高风险" : "中风险"}：${tags.join(", ")}${note ? `。备注：${note}` : ""}`,
          triggeredAt: new Date(),
          status: "PENDING",
        },
      });

      // 如果需要通知班主任
      if (notifyHomeroom) {
        // 查找学生的班主任
        const student = await prisma.student.findUnique({
          where: { id: studentId },
          include: { class: { include: { teacherClasses: { where: { isHomeroom: true } } } } },
        });

        if (student?.class?.teacherClasses?.[0]?.teacherId) {
          // TODO: 发送通知给班主任（需要消息系统支持）
          console.log(
            `通知班主任 ${student.class.teacherClasses[0].teacherId}：学生 ${student.name} 心理评价${riskLevel === "HIGH" ? "高风险" : "中风险"}`
          );
        }
      }
    }

    // 异步触发六维重算（身心维度）
    refreshStudentDimensions(studentId).catch((err) => {
      console.error(`重算学生 ${studentId} 六维分数失败:`, err);
    });

    return Response.json({
      success: true,
      assessment: {
        id: assessment.id,
        studentId: assessment.studentId,
        type,
        tags,
        note,
        riskLevel,
        score,
        semester,
        createdAt: assessment.createdAt.toISOString(),
      },
      warningTriggered: riskLevel === "MEDIUM" || riskLevel === "HIGH",
    });
  } catch (error) {
    console.error("保存心理评价错误:", error);
    return Response.json({ error: "保存失败" }, { status: 500 });
  }
}
