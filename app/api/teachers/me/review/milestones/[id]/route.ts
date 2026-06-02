import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /approve：通过审核
 * - 更新里程碑状态为 APPROVED
 * - 可选更新 relatedData 记录分数变化
 * - 触发六维分数重算（简化版：直接更新 CareerProfile 的 sixDimensions）
 */
export async function POST(
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
    const { points, dimension } = body;

    // 查询里程碑
    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            classId: true,
            careerProfile: true,
          },
        },
      },
    });

    if (!milestone) {
      return Response.json({ error: "里程碑不存在" }, { status: 404 });
    }

    if (milestone.status !== "PENDING") {
      return Response.json({ error: "该里程碑已处理" }, { status: 400 });
    }

    // 权限检查
    if (session.user.role !== "ADMIN") {
      const teacherClasses = await prisma.teacherClass.findMany({
        where: { teacherId: session.user.teacherId! },
        select: { classId: true },
      });
      const classIds = teacherClasses.map((tc) => tc.classId);

      if (!classIds.includes(milestone.student.classId)) {
        return Response.json({ error: "无权审核此里程碑" }, { status: 403 });
      }
    }

    // 更新里程碑状态
    const relatedData = milestone.relatedData
      ? JSON.parse(milestone.relatedData)
      : {};
    relatedData.approvedAt = new Date().toISOString();
    relatedData.approvedBy = session.user.teacherId || session.user.id;
    if (points) relatedData.awardedPoints = points;
    if (dimension) relatedData.awardedDimension = dimension;

    await prisma.milestone.update({
      where: { id },
      data: {
        status: "APPROVED",
        relatedData: JSON.stringify(relatedData),
      },
    });

    // 触发六维分数重算（简化版）
    // 实际场景中应该调用完整的重算逻辑
    if (milestone.student.careerProfile && points && dimension) {
      const careerProfile = milestone.student.careerProfile;
      const sixDimensions: Record<string, number> = careerProfile.sixDimensions
        ? JSON.parse(careerProfile.sixDimensions)
        : {};

      // 增加对应维度分数
      if (sixDimensions[dimension] !== undefined) {
        sixDimensions[dimension] += points;
      } else {
        sixDimensions[dimension] = points;
      }

      await prisma.careerProfile.update({
        where: { studentId: milestone.student.id },
        data: {
          sixDimensions: JSON.stringify(sixDimensions),
        },
      });
    }

    return Response.json({ success: true, message: "已通过审核" });
  } catch (error) {
    console.error("审核里程碑错误:", error);
    return Response.json({ error: "审核失败" }, { status: 500 });
  }
}

/**
 * PUT /reject：驳回审核
 * - 更新里程碑状态为 REJECTED
 * - 记录驳回理由
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
    const { reason } = body;

    if (!reason) {
      return Response.json({ error: "请填写驳回理由" }, { status: 400 });
    }

    // 查询里程碑
    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            classId: true,
          },
        },
      },
    });

    if (!milestone) {
      return Response.json({ error: "里程碑不存在" }, { status: 404 });
    }

    if (milestone.status !== "PENDING") {
      return Response.json({ error: "该里程碑已处理" }, { status: 400 });
    }

    // 权限检查
    if (session.user.role !== "ADMIN") {
      const teacherClasses = await prisma.teacherClass.findMany({
        where: { teacherId: session.user.teacherId! },
        select: { classId: true },
      });
      const classIds = teacherClasses.map((tc) => tc.classId);

      if (!classIds.includes(milestone.student.classId)) {
        return Response.json({ error: "无权审核此里程碑" }, { status: 403 });
      }
    }

    // 更新里程碑状态为驳回
    const relatedData = milestone.relatedData
      ? JSON.parse(milestone.relatedData)
      : {};
    relatedData.rejectedAt = new Date().toISOString();
    relatedData.rejectedBy = session.user.teacherId || session.user.id;
    relatedData.rejectReason = reason;

    await prisma.milestone.update({
      where: { id },
      data: {
        status: "REJECTED",
        relatedData: JSON.stringify(relatedData),
      },
    });

    return Response.json({ success: true, message: "已驳回" });
  } catch (error) {
    console.error("驳回里程碑错误:", error);
    return Response.json({ error: "驳回失败" }, { status: 500 });
  }
}
