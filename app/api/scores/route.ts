import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parsePagination, buildPaginatedResponse } from "@/lib/pagination";

// GET - 获取成绩（带分页）
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const semester = searchParams.get("semester");
    const pagination = parsePagination(searchParams);
    const { skip, take } = {
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    };

    // 学生只能查看自己的成绩
    if (session.user.role === "STUDENT" && session.user.studentId) {
      const where = {
        studentId: session.user.studentId,
        ...(semester ? { semester } : {}),
      };
      const [scores, total] = await Promise.all([
        prisma.score.findMany({
          where,
          orderBy: [{ examDate: "desc" }, { subject: "asc" }],
          skip,
          take,
        }),
        prisma.score.count({ where }),
      ]);
      return Response.json(buildPaginatedResponse(scores, total, pagination));
    }

    // 教师/管理员可以查看指定学生成绩
    if (session.user.role === "TEACHER" || session.user.role === "ADMIN") {
      if (!studentId) {
        return Response.json(
          { error: "缺少 studentId 参数" },
          { status: 400 }
        );
      }
      const where = {
        studentId,
        ...(semester ? { semester } : {}),
      };
      const [scores, total] = await Promise.all([
        prisma.score.findMany({
          where,
          orderBy: [{ examDate: "desc" }, { subject: "asc" }],
          skip,
          take,
        }),
        prisma.score.count({ where }),
      ]);
      return Response.json(buildPaginatedResponse(scores, total, pagination));
    }

    return Response.json({ error: "无权限" }, { status: 403 });
  } catch (error) {
    console.error("获取成绩错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST - 录入成绩（教师/管理员）
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
      subject,
      examType,
      score,
      total,
      semester,
      examDate,
    } = body;

    if (!studentId || !subject || score === undefined) {
      return Response.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const newScore = await prisma.score.create({
      data: {
        studentId,
        subject,
        examType: examType || "MONTHLY",
        score: parseFloat(score),
        total: total ? parseFloat(total) : 100,
        semester: semester || "2024-2025-1",
        examDate: examDate ? new Date(examDate) : new Date(),
      },
    });

    return Response.json({ score: newScore });
  } catch (error) {
    console.error("录入成绩错误:", error);
    return Response.json({ error: "录入失败" }, { status: 500 });
  }
}
