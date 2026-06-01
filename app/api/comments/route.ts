import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePagination, buildPaginatedResponse } from "@/lib/pagination";

// POST - 教师创建评语
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.teacherId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { studentId, type, content, semester, dimensions } = body;

    if (!studentId || !content) {
      return Response.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        studentId,
        teacherId: session.user.teacherId,
        type: type || "HOMEROOM",
        content,
        semester: semester || "2024-2025-1",
        dimensions: dimensions || null,
      },
      include: {
        teacher: {
          select: { name: true, title: true },
        },
      },
    });

    return Response.json({ comment });
  } catch (error) {
    console.error("创建评语错误:", error);
    return Response.json({ error: "创建失败" }, { status: 500 });
  }
}

// GET - 学生/教师/管理员查看评语（带分页）
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

    let where: Record<string, unknown> = {};
    let data: unknown[] = [];
    let total = 0;

    // 学生只能查看自己的评语
    if (session.user.role === "STUDENT" && session.user.studentId) {
      where = { studentId: session.user.studentId };
      [data, total] = await Promise.all([
        prisma.comment.findMany({
          where,
          include: {
            teacher: { select: { name: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.comment.count({ where }),
      ]);
    }
    // 教师查看自己写的评语或指定学生的评语
    else if (session.user.role === "TEACHER" && session.user.teacherId) {
      if (studentId) {
        where = { studentId };
      } else {
        where = { teacherId: session.user.teacherId };
      }
      [data, total] = await Promise.all([
        prisma.comment.findMany({
          where,
          include: {
            teacher: { select: { name: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.comment.count({ where }),
      ]);
    }
    // 管理员可以查看所有
    else if (session.user.role === "ADMIN") {
      where = studentId ? { studentId } : {};
      [data, total] = await Promise.all([
        prisma.comment.findMany({
          where,
          include: {
            teacher: { select: { name: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.comment.count({ where }),
      ]);
    } else {
      return Response.json({ error: "无权限" }, { status: 403 });
    }

    return Response.json(buildPaginatedResponse(data, total, pagination));
  } catch (error) {
    console.error("获取评语错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}
