import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePagination, buildPaginatedResponse } from "@/lib/pagination";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.studentId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      scaleId,
      scaleCode,
      scaleName,
      type,
      score,
      riskLevel,
      answers,
      semester,
    } = body;

    const assessment = await prisma.assessment.create({
      data: {
        studentId: session.user.studentId,
        type: type || "PSYCHOLOGY",
        scaleName: scaleName || "未知量表",
        scaleCode: scaleCode || scaleId,
        resultJson: JSON.stringify({
          scaleId,
          answers,
          score,
        }),
        score: score || 0,
        riskLevel: riskLevel || "NORMAL",
        semester: semester || "2024-2025-1",
        visibleToStudent: true,
        visibleToParent: riskLevel !== "WARNING",
      },
    });

    return Response.json({ assessment });
  } catch (error) {
    console.error("保存测评结果错误:", error);
    return Response.json({ error: "保存失败" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.studentId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const pagination = parsePagination(searchParams);
    const { skip, take } = {
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    };

    const where = { studentId: session.user.studentId };
    const [assessments, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.assessment.count({ where }),
    ]);

    return Response.json(buildPaginatedResponse(assessments, total, pagination));
  } catch (error) {
    console.error("获取测评列表错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}
