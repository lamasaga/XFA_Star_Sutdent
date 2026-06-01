import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePagination, buildPaginatedResponse } from "@/lib/pagination";

// GET - 获取班级列表（分页+搜索+筛选）
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const gradeId = searchParams.get("gradeId");
    const keyword = searchParams.get("keyword");
    const pagination = parsePagination(searchParams);

    const where: Record<string, unknown> = {};

    if (gradeId) where.gradeId = gradeId;
    if (keyword) {
      where.name = { contains: keyword };
    }

    const skip = (pagination.page - 1) * pagination.pageSize;
    const take = pagination.pageSize;

    const [classes, total] = await Promise.all([
      prisma.class.findMany({
        where,
        include: {
          grade: true,
          students: { select: { id: true, name: true, status: true } },
          teacherClasses: {
            include: {
              teacher: { select: { id: true, name: true, teacherRole: true } },
            },
          },
        },
        orderBy: { gradeId: "asc" },
        skip,
        take,
      }),
      prisma.class.count({ where }),
    ]);

    return Response.json(buildPaginatedResponse(classes, total, pagination));
  } catch (error) {
    console.error("获取班级列表错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST - 创建班级
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, gradeId } = body;

    if (!name || !gradeId) {
      return Response.json({ error: "缺少必填字段" }, { status: 400 });
    }

    // 检查同年级下是否已存在同名班级
    const existing = await prisma.class.findFirst({
      where: { name, gradeId },
    });
    if (existing) {
      return Response.json(
        { error: "该年级下已存在同名班级" },
        { status: 409 }
      );
    }

    const classObj = await prisma.class.create({
      data: { name, gradeId },
      include: {
        grade: true,
        students: true,
        teacherClasses: {
          include: {
            teacher: { select: { id: true, name: true } },
          },
        },
      },
    });

    return Response.json(classObj, { status: 201 });
  } catch (error) {
    console.error("创建班级错误:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "创建失败" },
      { status: 500 }
    );
  }
}
