import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET：获取待审核活动记录
 * 教师只能审核自己所教班级学生的活动记录
 * 返回 status === "PENDING" 的活动记录
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
      return Response.json({ activities: [] });
    }

    // 查询待审核活动记录
    const where = session.user.role === "ADMIN"
      ? { status: "PENDING" }
      : { status: "PENDING", student: { classId: { in: classIds } } };

    const activities = await prisma.activity.findMany({
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

    return Response.json({ activities });
  } catch (error) {
    console.error("获取待审核活动记录错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}

/**
 * POST /confirm：确认活动记录
 * - 更新活动状态为 APPROVED
 * - 设置积分和评估教师
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return Response.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { activityId, points, evaluation } = body;

    if (!activityId) {
      return Response.json({ error: "缺少活动ID" }, { status: 400 });
    }

    // 查询活动记录
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        student: {
          select: {
            id: true,
            classId: true,
          },
        },
      },
    });

    if (!activity) {
      return Response.json({ error: "活动记录不存在" }, { status: 404 });
    }

    if (activity.status !== "PENDING") {
      return Response.json({ error: "该活动记录已处理" }, { status: 400 });
    }

    // 权限检查
    if (session.user.role !== "ADMIN") {
      const teacherClasses = await prisma.teacherClass.findMany({
        where: { teacherId: session.user.teacherId! },
        select: { classId: true },
      });
      const classIds = teacherClasses.map((tc) => tc.classId);

      if (!classIds.includes(activity.student.classId)) {
        return Response.json({ error: "无权审核此活动记录" }, { status: 403 });
      }
    }

    // 更新活动状态
    await prisma.activity.update({
      where: { id: activityId },
      data: {
        status: "APPROVED",
        points: points ?? activity.points,
        teacherEvaluation: evaluation ?? activity.teacherEvaluation,
        evaluatorId: session.user.teacherId || session.user.id,
      },
    });

    return Response.json({ success: true, message: "已确认活动记录" });
  } catch (error) {
    console.error("确认活动记录错误:", error);
    return Response.json({ error: "确认失败" }, { status: 500 });
  }
}

/**
 * PUT /reject：驳回活动记录
 * - 更新活动状态为 REJECTED
 * - 记录驳回理由
 */
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return Response.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { activityId, reason } = body;

    if (!activityId || !reason) {
      return Response.json({ error: "缺少活动ID或驳回理由" }, { status: 400 });
    }

    // 查询活动记录
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        student: {
          select: {
            id: true,
            classId: true,
          },
        },
      },
    });

    if (!activity) {
      return Response.json({ error: "活动记录不存在" }, { status: 404 });
    }

    if (activity.status !== "PENDING") {
      return Response.json({ error: "该活动记录已处理" }, { status: 400 });
    }

    // 权限检查
    if (session.user.role !== "ADMIN") {
      const teacherClasses = await prisma.teacherClass.findMany({
        where: { teacherId: session.user.teacherId! },
        select: { classId: true },
      });
      const classIds = teacherClasses.map((tc) => tc.classId);

      if (!classIds.includes(activity.student.classId)) {
        return Response.json({ error: "无权审核此活动记录" }, { status: 403 });
      }
    }

    // 更新活动状态为驳回
    await prisma.activity.update({
      where: { id: activityId },
      data: {
        status: "REJECTED",
        teacherEvaluation: reason,
        evaluatorId: session.user.teacherId || session.user.id,
      },
    });

    return Response.json({ success: true, message: "已驳回活动记录" });
  } catch (error) {
    console.error("驳回活动记录错误:", error);
    return Response.json({ error: "驳回失败" }, { status: 500 });
  }
}
