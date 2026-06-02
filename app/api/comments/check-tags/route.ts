import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - 检查某学生本学期已有的评语标签
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  // 权限检查：教师或管理员
  if (!session?.user) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "TEACHER" && role !== "ADMIN") {
    return Response.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const semester = searchParams.get("semester") || "2024-2025-1";

    if (!studentId) {
      return Response.json(
        { error: "缺少必要参数 studentId" },
        { status: 400 }
      );
    }

    // 查询该学生本学期所有评语
    const comments = await prisma.comment.findMany({
      where: {
        studentId,
        semester,
      },
      select: {
        dimensions: true,
      },
    });

    // 聚合所有已使用的标签
    const tags: Record<string, string[]> = {};

    for (const comment of comments) {
      if (!comment.dimensions) continue;

      try {
        const parsed = JSON.parse(comment.dimensions) as Record<
          string,
          string[]
        >;
        for (const [dimension, tagList] of Object.entries(parsed)) {
          if (!Array.isArray(tagList)) continue;

          if (!tags[dimension]) {
            tags[dimension] = [];
          }

          for (const tag of tagList) {
            if (typeof tag === "string" && !tags[dimension].includes(tag)) {
              tags[dimension].push(tag);
            }
          }
        }
      } catch {
        // 忽略解析失败的 dimensions
        continue;
      }
    }

    return Response.json({ tags });
  } catch (error) {
    console.error("检查评语标签错误:", error);
    return Response.json({ error: "查询失败" }, { status: 500 });
  }
}
