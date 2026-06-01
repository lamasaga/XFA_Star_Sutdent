import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - 获取心理预警列表
export async function GET() {
  const session = await getServerSession(authOptions);

  if (
    !session?.user ||
    (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")
  ) {
    return Response.json({ error: "无权限" }, { status: 403 });
  }

  try {
    // 并行查询 WARNING 和 WATCH 等级记录
    const [warnings, watches] = await Promise.all([
      prisma.assessment.findMany({
        where: { riskLevel: "WARNING" },
        include: {
          student: {
            include: {
              class: { include: { grade: true } },
              careerProfile: { select: { fiveDimensions: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50, // 限制数量
      }),
      prisma.assessment.findMany({
        where: { riskLevel: "WATCH" },
        include: {
          student: {
            include: {
              class: { include: { grade: true } },
              careerProfile: { select: { fiveDimensions: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    return Response.json({ warnings, watches });
  } catch (error) {
    console.error("获取预警列表错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}
