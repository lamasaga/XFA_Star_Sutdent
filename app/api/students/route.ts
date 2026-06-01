import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  parsePagination,
  buildPaginatedResponse,
} from "@/lib/pagination";

// GET - 获取学生列表（带分页）
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
    const classId = searchParams.get("classId");
    const status = searchParams.get("status");
    const keyword = searchParams.get("keyword");
    const pagination = parsePagination(searchParams);

    const where: Record<string, unknown> = {};

    if (classId) where.classId = classId;
    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: "insensitive" } },
        { studentNo: { contains: keyword, mode: "insensitive" } },
      ];
    }

    // 教师只能查看自己班级关联的学生
    if (session.user.role === "TEACHER" && session.user.teacherId) {
      const teacherClasses = await prisma.teacherClass.findMany({
        where: { teacherId: session.user.teacherId },
        select: { classId: true },
      });
      const classIds = teacherClasses.map((tc) => tc.classId);
      where.classId = keyword && where.classId
        ? { in: classIds, equals: where.classId }
        : { in: classIds };
    }

    const { skip, take } = {
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    };

    // 并行查询数据和总数
    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          class: {
            include: { grade: true },
          },
          user: {
            select: { email: true },
          },
          _count: {
            select: {
              comments: true,
              milestones: true,
              activities: true,
              scores: true,
            },
          },
        },
        orderBy: { name: "asc" },
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
