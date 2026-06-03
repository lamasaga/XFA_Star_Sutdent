import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePagination, buildPaginatedResponse } from "@/lib/pagination";
import bcrypt from "bcryptjs";

// GET - 获取教师列表（分页+搜索）
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get("keyword");
    const teacherRole = searchParams.get("teacherRole");
    const pagination = parsePagination(searchParams);

    const where: Record<string, unknown> = {};

    if (teacherRole) where.teacherRole = teacherRole;
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { user: { email: { contains: keyword } } },
        { title: { contains: keyword } },
      ];
    }

    const skip = (pagination.page - 1) * pagination.pageSize;
    const take = pagination.pageSize;

    const [teachers, total] = await Promise.all([
      prisma.teacher.findMany({
        where,
        include: {
          user: { select: { email: true, id: true } },
          teacherClasses: {
            include: {
              class: { include: { grade: true } },
            },
          },
          _count: {
            select: { comments: true, teacherClasses: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.teacher.count({ where }),
    ]);

    return Response.json(buildPaginatedResponse(teachers, total, pagination));
  } catch (error) {
    console.error("获取教师列表错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST - 创建教师（同时创建 User 账户）
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      title,
      subjects,
      teacherRole = "SUBJECT",
      classIds,
      homeroomClassId,
    } = body;

    if (!name || !email) {
      return Response.json({ error: "缺少必填字段" }, { status: 400 });
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return Response.json({ error: "邮箱已存在" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password || "teacher123", 10);
    const subjectsJson = Array.isArray(subjects) ? JSON.stringify(subjects) : JSON.stringify(["语文"]);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "TEACHER",
        status: "ACTIVE",
        teacher: {
          create: {
            name,
            title: title || null,
            subjects: subjectsJson,
            teacherRole,
          },
        },
      },
      include: {
        teacher: {
          include: {
            teacherClasses: { include: { class: { include: { grade: true } } } },
          },
        },
      },
    });

    // 如果指定了班级，创建关联
    if (classIds && Array.isArray(classIds) && classIds.length > 0) {
      await prisma.teacherClass.createMany({
        data: classIds.map((classId: string) => ({
          teacherId: user.teacher!.id,
          classId,
          isHomeroom: homeroomClassId === classId,
        })),
      });
    }

    // 如果单独指定了班主任班级（不在classIds中）
    if (homeroomClassId && (!classIds || !classIds.includes(homeroomClassId))) {
      await prisma.teacherClass.create({
        data: {
          teacherId: user.teacher!.id,
          classId: homeroomClassId,
          isHomeroom: true,
        },
      });
    }

    // 如果设置了班主任，更新 teacherRole
    if (homeroomClassId) {
      await prisma.teacher.update({
        where: { id: user.teacher!.id },
        data: { teacherRole: "HOMEROOM" },
      });
    }

    // 重新查询以获取完整数据
    const teacher = await prisma.teacher.findUnique({
      where: { id: user.teacher!.id },
      include: {
        user: { select: { email: true, id: true } },
        teacherClasses: { include: { class: { include: { grade: true } } } },
        _count: { select: { comments: true, teacherClasses: true } },
      },
    });

    return Response.json(teacher, { status: 201 });
  } catch (error) {
    console.error("创建教师错误:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "创建失败" },
      { status: 500 }
    );
  }
}
