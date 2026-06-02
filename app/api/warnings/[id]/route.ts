import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * PUT：更新单条预警状态
 * 请求体：{ status, resolution }
 * status: "PENDING" | "PROCESSING" | "RESOLVED" | "OBSERVING"
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return Response.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, resolution } = body;

    if (!status) {
      return Response.json({ error: "缺少状态参数" }, { status: 400 });
    }

    const validStatuses = ["PENDING", "PROCESSING", "RESOLVED", "OBSERVING"];
    if (!validStatuses.includes(status)) {
      return Response.json({ error: "无效的状态值" }, { status: 400 });
    }

    // 查询预警是否存在
    const warning = await prisma.warning.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            classId: true,
          },
        },
      },
    });

    if (!warning) {
      return Response.json({ error: "预警不存在" }, { status: 404 });
    }

    // 权限检查：非管理员/心理老师只能操作自己班级的学生
    const teacherRole = session.user.teacherRole;
    if (teacherRole !== "PSYCHOLOGY" && session.user.role !== "ADMIN") {
      const teacherClasses = await prisma.teacherClass.findMany({
        where: { teacherId: session.user.teacherId! },
        select: { classId: true },
      });
      const classIds = teacherClasses.map((tc) => tc.classId);

      if (!classIds.includes(warning.student.classId)) {
        return Response.json({ error: "无权操作此预警" }, { status: 403 });
      }
    }

    // 更新预警
    const updated = await prisma.warning.update({
      where: { id },
      data: {
        status,
        ...(resolution && { resolution }),
        ...(status === "RESOLVED" && { resolvedAt: new Date() }),
        handledBy: session.user.teacherId || session.user.id,
      },
    });

    return Response.json({ success: true, warning: updated });
  } catch (error) {
    console.error("更新预警错误:", error);
    return Response.json({ error: "更新失败" }, { status: 500 });
  }
}

/**
 * GET：获取单条预警详情
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return Response.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const warning = await prisma.warning.findUnique({
      where: { id },
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
    });

    if (!warning) {
      return Response.json({ error: "预警不存在" }, { status: 404 });
    }

    // 权限检查
    const teacherRole = session.user.teacherRole;
    if (teacherRole !== "PSYCHOLOGY" && session.user.role !== "ADMIN") {
      const teacherClasses = await prisma.teacherClass.findMany({
        where: { teacherId: session.user.teacherId! },
        select: { classId: true },
      });
      const classIds = teacherClasses.map((tc) => tc.classId);

      if (!classIds.includes(warning.student.classId)) {
        return Response.json({ error: "无权查看此预警" }, { status: 403 });
      }
    }

    return Response.json({ warning });
  } catch (error) {
    console.error("获取预警详情错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}
