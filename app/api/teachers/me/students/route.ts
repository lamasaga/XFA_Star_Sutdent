import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePagination, buildPaginatedResponse } from "@/lib/pagination";

/**
 * GET /api/teachers/me/students
 *
 * 获取教师负责的学生列表，包含六维分数等完整数据。
 *
 * 权限：
 * - TEACHER：只返回其所教班级的学生（通过 TeacherClass 关联）
 * - PSYCHOLOGY：可以返回全校学生
 * - ADMIN：可以返回全校学生
 *
 * 查询参数：
 * - keyword: 按姓名或学号搜索
 * - classId: 按班级筛选
 * - page: 页码（默认1）
 * - pageSize: 每页条数（默认20，最大100）
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 认证检查
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }

    const userRole = session.user.role;
    const teacherId = session.user.teacherId;

    // 2. 权限检查：只有 TEACHER、PSYCHOLOGY、ADMIN 可以访问
    if (!["TEACHER", "PSYCHOLOGY", "ADMIN"].includes(userRole)) {
      return Response.json({ error: "无权访问" }, { status: 403 });
    }

    // 3. 解析查询参数
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword")?.trim();
    const classIdFilter = searchParams.get("classId");
    const pagination = parsePagination(searchParams);

    // 4. 构建班级筛选条件
    let allowedClassIds: string[] | undefined;

    if (userRole === "ADMIN" || userRole === "PSYCHOLOGY") {
      // 管理员和心理老师可以查看全校学生，不限制班级
      allowedClassIds = undefined;
    } else if (userRole === "TEACHER" && teacherId) {
      // 普通教师：只返回其所教班级的学生
      const teacherClasses = await prisma.teacherClass.findMany({
        where: { teacherId },
        select: { classId: true },
      });
      allowedClassIds = teacherClasses.map((tc) => tc.classId);

      // 如果该教师没有任教班级，则返回空结果
      if (allowedClassIds.length === 0) {
        return Response.json(
          buildPaginatedResponse([], 0, pagination),
          { status: 200 }
        );
      }
    } else {
      return Response.json({ error: "教师信息不完整" }, { status: 403 });
    }

    // 5. 构建 where 条件
    const where: Record<string, unknown> = {};

    // 班级范围限制
    if (allowedClassIds !== undefined) {
      where.classId = { in: allowedClassIds };
    }

    // 按 classId 筛选（在允许范围内进一步筛选）
    if (classIdFilter) {
      if (allowedClassIds !== undefined && !allowedClassIds.includes(classIdFilter)) {
        // 教师试图访问不属于自己班级的学生
        return Response.json(
          buildPaginatedResponse([], 0, pagination),
          { status: 200 }
        );
      }
      where.classId = classIdFilter;
    }

    // 关键词搜索（姓名或学号）
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { studentNo: { contains: keyword } },
      ];
    }

    // 6. 查询学生总数
    const total = await prisma.student.count({ where });

    // 7. 查询学生列表（含关联数据）
    const students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        name: true,
        studentNo: true,
        gender: true,
        status: true,
        class: {
          select: {
            id: true,
            name: true,
            grade: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        careerProfile: {
          select: {
            sixDimensions: true,
          },
        },
        _count: {
          select: {
            comments: true,
            milestones: true,
            activities: true,
          },
        },
        warnings: {
          where: {
            status: {
              in: ["PENDING", "PROCESSING", "OBSERVING"],
            },
          },
          select: {
            id: true,
          },
          take: 1,
        },
      },
      orderBy: {
        studentNo: "asc",
      },
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    });

    // 8. 组装响应数据
    const formattedStudents = students.map((student) => {
      // 解析六维分数 JSON
      let dimensions: Record<string, number> | null = null;
      if (student.careerProfile?.sixDimensions) {
        try {
          dimensions = JSON.parse(student.careerProfile.sixDimensions);
        } catch {
          // JSON 解析失败，保持 null
          dimensions = null;
        }
      }

      // 判断是否有未处理的预警
      const hasWarning = student.warnings.length > 0;

      return {
        id: student.id,
        name: student.name,
        studentNo: student.studentNo,
        gender: student.gender,
        status: student.status,
        className: student.class
          ? `${student.class.grade?.name ?? ""}${student.class.name}`
          : null,
        classId: student.class?.id ?? null,
        gradeName: student.class?.grade?.name ?? null,
        dimensions,
        commentCount: student._count.comments,
        milestoneCount: student._count.milestones,
        activityCount: student._count.activities,
        hasWarning,
      };
    });

    // 9. 返回分页响应
    return Response.json(
      buildPaginatedResponse(formattedStudents, total, pagination),
      { status: 200 }
    );
  } catch (error) {
    console.error("[API /teachers/me/students] Error:", error);
    return Response.json(
      { error: "服务器内部错误" },
      { status: 500 }
    );
  }
}
