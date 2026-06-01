import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - 获取单个班级详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const classObj = await prisma.class.findUnique({
      where: { id },
      include: {
        grade: true,
        students: {
          select: { id: true, name: true, studentNo: true, status: true, graduationYear: true },
          orderBy: { name: "asc" },
        },
        teacherClasses: {
          include: {
            teacher: { select: { id: true, name: true, teacherRole: true, title: true } },
          },
        },
        _count: { select: { students: true } },
      },
    });

    if (!classObj) {
      return Response.json({ error: "班级不存在" }, { status: 404 });
    }

    return Response.json(classObj);
  } catch (error) {
    console.error("获取班级详情错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}

// PUT - 更新班级
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, gradeId } = body;

    const existing = await prisma.class.findUnique({
      where: { id },
    });
    if (!existing) {
      return Response.json({ error: "班级不存在" }, { status: 404 });
    }

    // 检查同名冲突
    if (name && gradeId) {
      const conflict = await prisma.class.findFirst({
        where: { name, gradeId, NOT: { id } },
      });
      if (conflict) {
        return Response.json(
          { error: "该年级下已存在同名班级" },
          { status: 409 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (gradeId) updateData.gradeId = gradeId;

    const updated = await prisma.class.update({
      where: { id },
      data: updateData,
      include: {
        grade: true,
        students: true,
        teacherClasses: {
          include: { teacher: { select: { id: true, name: true } } },
        },
      },
    });

    return Response.json(updated);
  } catch (error) {
    console.error("更新班级错误:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE - 删除班级（仅当班级无学生时）
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const existing = await prisma.class.findUnique({
      where: { id },
      include: { _count: { select: { students: true } } },
    });
    if (!existing) {
      return Response.json({ error: "班级不存在" }, { status: 404 });
    }

    if (existing._count.students > 0) {
      return Response.json(
        { error: "班级下还有学生，无法删除。请先转移或删除学生。" },
        { status: 400 }
      );
    }

    // 先删除教师班级关联
    await prisma.teacherClass.deleteMany({ where: { classId: id } });

    await prisma.class.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    console.error("删除班级错误:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 }
    );
  }
}
