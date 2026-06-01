import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePagination, buildPaginatedResponse } from "@/lib/pagination";

// GET - 获取活动记录（带分页）
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const pagination = parsePagination(searchParams);
    const { skip, take } = {
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    };

    // 学生只能查看自己的活动记录
    if (session.user.role === "STUDENT" && session.user.studentId) {
      const where = { studentId: session.user.studentId };
      const [activities, total] = await Promise.all([
        prisma.activity.findMany({
          where,
          include: {
            evaluator: { select: { name: true } },
          },
          orderBy: { startDate: "desc" },
          skip,
          take,
        }),
        prisma.activity.count({ where }),
      ]);
      return Response.json(
        buildPaginatedResponse(activities, total, pagination)
      );
    }

    // 教师/管理员可以查看指定学生的活动记录
    if (session.user.role === "TEACHER" || session.user.role === "ADMIN") {
      const where = studentId ? { studentId } : {};
      const [activities, total] = await Promise.all([
        prisma.activity.findMany({
          where,
          include: {
            student: { select: { name: true, studentNo: true } },
            evaluator: { select: { name: true } },
          },
          orderBy: { startDate: "desc" },
          skip,
          take,
        }),
        prisma.activity.count({ where }),
      ]);
      return Response.json(
        buildPaginatedResponse(activities, total, pagination)
      );
    }

    return Response.json({ error: "无权限" }, { status: 403 });
  } catch (error) {
    console.error("获取活动记录错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST - 创建活动记录（教师/管理员）
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
      name,
      category,
      type,
      role,
      result,
      startDate,
      endDate,
      points,
    } = body;

    if (!studentId || !name) {
      return Response.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const activity = await prisma.activity.create({
      data: {
        studentId,
        name,
        category: category || "OTHER",
        type: type || "INTERNAL",
        role: role || "参与者",
        result: result || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        evaluatorId: session.user.teacherId || null,
        status: "APPROVED",
        points: points || 0,
      },
    });

    return Response.json({ activity });
  } catch (error) {
    console.error("创建活动记录错误:", error);
    return Response.json({ error: "创建失败" }, { status: 500 });
  }
}
