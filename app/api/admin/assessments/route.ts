import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== "ADMIN") {
    return Response.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const where: Record<string, unknown> = {};
    if (type) where.type = type;

    const assessments = await prisma.assessment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        student: {
          select: { name: true, studentNo: true },
        },
      },
    });

    return Response.json({ assessments });
  } catch (error) {
    console.error("获取测评记录错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}
