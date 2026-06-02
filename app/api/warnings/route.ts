import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectWarnings } from "@/lib/warning-detector";

// ==================== GET：获取预警列表 ====================

/**
 * 获取预警列表
 * 查询参数：
 *   - type: 按预警类型筛选（可选）
 *   - severity: 按严重程度筛选（可选）
 *   - status: 按状态筛选（可选，默认返回未解决的）
 *
 * 权限：
 *   - 教师只能看自己班级的学生预警
 *   - 心理老师（PSYCHOLOGY）可以看全校
 *   - 管理员可以看全校
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return Response.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || undefined;
    const severity = searchParams.get("severity") || undefined;
    const status = searchParams.get("status") || undefined;

    // 构建查询条件
    const where: Record<string, unknown> = {};

    if (type) {
      where.type = type;
    }
    if (severity) {
      where.severity = severity;
    }
    if (status) {
      where.status = status;
    }

    // 权限过滤：非心理老师/管理员只能看自己班级的学生
    const teacherRole = session.user.teacherRole;
    if (teacherRole !== "PSYCHOLOGY" && session.user.role !== "ADMIN") {
      // 获取教师所教班级
      const teacherClasses = await prisma.teacherClass.findMany({
        where: { teacherId: session.user.teacherId! },
        select: { classId: true },
      });
      const classIds = teacherClasses.map((tc) => tc.classId);

      if (classIds.length === 0) {
        return Response.json({ warnings: [], stats: {} });
      }

      where.student = { classId: { in: classIds } };
    }

    // 查询预警列表
    const warnings = await prisma.warning.findMany({
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
      orderBy: [
        { severity: "asc" }, // HIGH 在前（按字母顺序 H < L < M）
        { triggeredAt: "desc" },
      ],
    });

    // 手动按严重程度排序：HIGH > MEDIUM > LOW > INFO
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, INFO: 3 };
    warnings.sort((a, b) => {
      const orderDiff = (severityOrder[a.severity as keyof typeof severityOrder] ?? 99) -
        (severityOrder[b.severity as keyof typeof severityOrder] ?? 99);
      if (orderDiff !== 0) return orderDiff;
      return new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime();
    });

    // 统计各类型数量
    const stats = {
      PSYCHOLOGY: 0,
      IMBALANCE: 0,
      DECAY: 0,
      DISCIPLINE: 0,
      LOW_ENGAGEMENT: 0,
      total: warnings.length,
      highSeverity: 0,
      pending: 0,
    };

    for (const w of warnings) {
      if (w.type in stats) {
        (stats as Record<string, number>)[w.type]++;
      }
      if (w.severity === "HIGH") stats.highSeverity++;
      if (w.status === "PENDING") stats.pending++;
    }

    return Response.json({ warnings, stats });
  } catch (error) {
    console.error("获取预警列表错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}

// ==================== POST：处理预警 ====================

/**
 * 处理预警
 * 请求体：{ warningId, action, resolution }
 * action: "RESOLVE" | "REFER" | "COMMUNICATE" | "OBSERVE"
 *
 * 处理后的状态映射：
 *   - RESOLVE → RESOLVED
 *   - REFER → PROCESSING（转介心理老师）
 *   - COMMUNICATE → PROCESSING（家校沟通中）
 *   - OBSERVE → OBSERVING
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return Response.json({ error: "无权限" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { warningId, action, resolution } = body;

    if (!warningId || !action) {
      return Response.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const validActions = ["RESOLVE", "REFER", "COMMUNICATE", "OBSERVE"];
    if (!validActions.includes(action)) {
      return Response.json({ error: "无效的操作类型" }, { status: 400 });
    }

    // 权限检查：教师只能处理自己班级学生的预警
    const teacherRole = session.user.teacherRole;
    if (teacherRole !== "PSYCHOLOGY" && session.user.role !== "ADMIN") {
      const warning = await prisma.warning.findUnique({
        where: { id: warningId },
        include: { student: { select: { classId: true } } },
      });

      if (!warning) {
        return Response.json({ error: "预警不存在" }, { status: 404 });
      }

      const teacherClasses = await prisma.teacherClass.findMany({
        where: { teacherId: session.user.teacherId! },
        select: { classId: true },
      });
      const classIds = teacherClasses.map((tc) => tc.classId);

      if (!classIds.includes(warning.student.classId)) {
        return Response.json({ error: "无权处理此预警" }, { status: 403 });
      }
    }

    // 状态映射
    const statusMap: Record<string, string> = {
      RESOLVE: "RESOLVED",
      REFER: "PROCESSING",
      COMMUNICATE: "PROCESSING",
      OBSERVE: "OBSERVING",
    };

    const actionLabels: Record<string, string> = {
      RESOLVE: "已面谈处理",
      REFER: "已转介心理老师",
      COMMUNICATE: "已进行家校沟通",
      OBSERVE: "转为持续观察",
    };

    const updated = await prisma.warning.update({
      where: { id: warningId },
      data: {
        status: statusMap[action],
        resolution: resolution
          ? `${actionLabels[action]}：${resolution}`
          : actionLabels[action],
        handledBy: session.user.teacherId || session.user.id,
        resolvedAt: action === "RESOLVE" ? new Date() : undefined,
      },
    });

    return Response.json({ success: true, warning: updated });
  } catch (error) {
    console.error("处理预警错误:", error);
    return Response.json({ error: "处理失败" }, { status: 500 });
  }
}

// ==================== PUT：触发预警检测 ====================

/**
 * 手动触发预警检测
 * 仅管理员和心理老师可用
 */
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return Response.json({ error: "无权限" }, { status: 403 });
  }

  const teacherRole = session.user.teacherRole;
  if (teacherRole !== "PSYCHOLOGY" && session.user.role !== "ADMIN") {
    return Response.json({ error: "仅管理员和心理老师可触发检测" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { classIds } = body;

    await detectWarnings(classIds);

    return Response.json({ success: true, message: "预警检测完成" });
  } catch (error) {
    console.error("触发预警检测错误:", error);
    return Response.json({ error: "检测失败" }, { status: 500 });
  }
}
