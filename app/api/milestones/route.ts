import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePagination, buildPaginatedResponse } from "@/lib/pagination";

// GET - 获取里程碑列表（带分页）
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

    // 学生只能查看自己的里程碑
    if (session.user.role === "STUDENT" && session.user.studentId) {
      const where = { studentId: session.user.studentId };
      const [milestones, total] = await Promise.all([
        prisma.milestone.findMany({
          where,
          orderBy: { occurredAt: "desc" },
          skip,
          take,
        }),
        prisma.milestone.count({ where }),
      ]);
      return Response.json(
        buildPaginatedResponse(milestones, total, pagination)
      );
    }

    // 教师/管理员可以查看指定学生的里程碑
    if (session.user.role === "TEACHER" || session.user.role === "ADMIN") {
      const where = studentId ? { studentId } : {};
      const [milestones, total] = await Promise.all([
        prisma.milestone.findMany({
          where,
          include: {
            student: { select: { name: true, studentNo: true } },
          },
          orderBy: { occurredAt: "desc" },
          skip,
          take,
        }),
        prisma.milestone.count({ where }),
      ]);
      return Response.json(
        buildPaginatedResponse(milestones, total, pagination)
      );
    }

    return Response.json({ error: "无权限" }, { status: 403 });
  } catch (error) {
    console.error("获取里程碑错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST - 创建里程碑（学生申报/教师创建）
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, description, type, occurredAt } = body;

    if (!title) {
      return Response.json({ error: "缺少标题" }, { status: 400 });
    }

    // 学生只能为自己创建（待审核状态）
    if (session.user.role === "STUDENT" && session.user.studentId) {
      const milestone = await prisma.milestone.create({
        data: {
          studentId: session.user.studentId,
          title,
          description: description || null,
          type: type || "PERSONAL",
          source: "MANUAL",
          status: "PENDING",
          occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        },
      });
      return Response.json({ milestone });
    }

    // 教师/管理员可以直接创建（已审核状态）
    if (session.user.role === "TEACHER" || session.user.role === "ADMIN") {
      const { studentId } = body;
      if (!studentId) {
        return Response.json(
          { error: "缺少 studentId" },
          { status: 400 }
        );
      }
      const milestone = await prisma.milestone.create({
        data: {
          studentId,
          title,
          description: description || null,
          type: type || "ACADEMIC",
          source: "MANUAL",
          status: "APPROVED",
          occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
        },
      });
      return Response.json({ milestone });
    }

    return Response.json({ error: "无权限" }, { status: 403 });
  } catch (error) {
    console.error("创建里程碑错误:", error);
    return Response.json({ error: "创建失败" }, { status: 500 });
  }
}
