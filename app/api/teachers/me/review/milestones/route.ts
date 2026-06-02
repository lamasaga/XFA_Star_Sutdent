import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET：获取待审核里程碑列表
 * 教师只能审核自己所教班级学生的里程碑
 * 返回 status === "PENDING" 的里程碑
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return Response.json({ error: "无权限" }, { status: 403 });
  }

  try {
    // 获取教师所教班级
    const teacherClasses = await prisma.teacherClass.findMany({
      where: { teacherId: session.user.teacherId! },
      select: { classId: true },
    });
    const classIds = teacherClasses.map((tc) => tc.classId);

    if (classIds.length === 0 && session.user.role !== "ADMIN") {
      return Response.json({ milestones: [] });
    }

    // 查询待审核里程碑
    const where = session.user.role === "ADMIN"
      ? { status: "PENDING" }
      : { status: "PENDING", student: { classId: { in: classIds } } };

    const milestones = await prisma.milestone.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentNo: true,
            classId: true,
            class: {
              select: {
                name: true,
                grade: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ milestones });
  } catch (error) {
    console.error("获取待审核里程碑错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}
