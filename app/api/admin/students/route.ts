import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePagination, buildPaginatedResponse } from "@/lib/pagination";
import bcrypt from "bcryptjs";

// GET - 获取学生列表（分页+搜索+筛选）
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const gradeId = searchParams.get("gradeId");
    const status = searchParams.get("status");
    const gender = searchParams.get("gender");
    const graduationYear = searchParams.get("graduationYear");
    const keyword = searchParams.get("keyword");
    const pagination = parsePagination(searchParams);

    const where: Record<string, unknown> = {};

    if (classId) where.classId = classId;
    if (status) where.status = status;
    if (gender) where.gender = gender;
    if (graduationYear) where.graduationYear = parseInt(graduationYear, 10);
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { studentNo: { contains: keyword } },
        { user: { email: { contains: keyword } } },
      ];
    }

    // gradeId 筛选：通过 class 关联
    let classFilter: string[] | undefined;
    if (gradeId) {
      const classes = await prisma.class.findMany({
        where: { gradeId },
        select: { id: true },
      });
      classFilter = classes.map((c) => c.id);
      if (classFilter.length > 0) {
        where.classId = classId
          ? { in: classFilter, equals: classId }
          : { in: classFilter };
      }
    }

    const skip = (pagination.page - 1) * pagination.pageSize;
    const take = pagination.pageSize;

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          class: { include: { grade: true } },
          user: { select: { email: true, id: true } },
        },
        orderBy: { studentNo: "asc" },
        skip,
        take,
      }),
      prisma.student.count({ where }),
    ]);

    return Response.json(buildPaginatedResponse(students, total, pagination));
  } catch (error) {
    console.error("获取学生列表错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST - 创建学生（同时创建 User 账户）
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      name,
      studentNo,
      email,
      password,
      gender,
      classId,
      graduationYear,
      enrollmentDate,
      status = "ENROLLED",
    } = body;

    if (!name || !studentNo || !email || !classId || !graduationYear) {
      return Response.json({ error: "缺少必填字段" }, { status: 400 });
    }

    // 检查学号是否已存在
    const existing = await prisma.student.findUnique({
      where: { studentNo },
    });
    if (existing) {
      return Response.json({ error: "学号已存在" }, { status: 409 });
    }

    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return Response.json({ error: "邮箱已存在" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password || "student123", 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "STUDENT",
        status: "ACTIVE",
        student: {
          create: {
            name,
            studentNo,
            gender: gender || "MALE",
            classId,
            graduationYear: parseInt(graduationYear, 10),
            enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
            status,
          },
        },
      },
      include: { student: { include: { class: { include: { grade: true } } } } },
    });

    return Response.json(user.student, { status: 201 });
  } catch (error) {
    console.error("创建学生错误:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "创建失败" },
      { status: 500 }
    );
  }
}
