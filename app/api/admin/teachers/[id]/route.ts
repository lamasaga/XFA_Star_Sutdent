import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET - 获取单个教师详情
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
    const teacher = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, id: true } },
        teacherClasses: {
          include: { class: { include: { grade: true } } },
        },
        _count: {
          select: { comments: true, teacherClasses: true },
        },
      },
    });

    if (!teacher) {
      return Response.json({ error: "教师不存在" }, { status: 404 });
    }

    return Response.json(teacher);
  } catch (error) {
    console.error("获取教师详情错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}

// PUT - 更新教师信息
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
    const {
      name,
      email,
      password,
      title,
      subjects,
      teacherRole,
      classIds,
      homeroomClassId,
    } = body;

    const existing = await prisma.teacher.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) {
      return Response.json({ error: "教师不存在" }, { status: 404 });
    }

    // 检查邮箱冲突
    if (email && email !== existing.user.email) {
      const conflict = await prisma.user.findUnique({
        where: { email },
      });
      if (conflict && conflict.id !== existing.userId) {
        return Response.json({ error: "邮箱已存在" }, { status: 409 });
      }
    }

    const teacherUpdate: Record<string, unknown> = {};
    if (name) teacherUpdate.name = name;
    if (title !== undefined) teacherUpdate.title = title || null;
    if (subjects) teacherUpdate.subjects = Array.isArray(subjects) ? JSON.stringify(subjects) : subjects;
    if (teacherRole) teacherUpdate.teacherRole = teacherRole;

    const userUpdate: Record<string, unknown> = {};
    if (name) userUpdate.name = name;
    if (email) userUpdate.email = email;
    if (password) userUpdate.password = await bcrypt.hash(password, 10);

    const updated = await prisma.teacher.update({
      where: { id },
      data: {
        ...teacherUpdate,
        user: { update: userUpdate },
      },
      include: {
        user: { select: { email: true, id: true } },
        teacherClasses: { include: { class: { include: { grade: true } } } },
      },
    });

    // 更新班级关联
    if (classIds && Array.isArray(classIds)) {
      // 先清除所有班级关联
      await prisma.teacherClass.deleteMany({
        where: { teacherId: id },
      });

      if (classIds.length > 0) {
        await prisma.teacherClass.createMany({
          data: classIds.map((classId: string) => ({
            teacherId: id,
            classId,
            isHomeroom: homeroomClassId === classId,
          })),
        });
      }
    }

    // 如果单独指定了班主任班级
    if (homeroomClassId && (!classIds || !classIds.includes(homeroomClassId))) {
      // 先清除该教师的班主任标记
      await prisma.teacherClass.updateMany({
        where: { teacherId: id, isHomeroom: true },
        data: { isHomeroom: false },
      });
      // 设置新的班主任关联
      await prisma.teacherClass.upsert({
        where: {
          teacherId_classId: {
            teacherId: id,
            classId: homeroomClassId,
          },
        },
        create: {
          teacherId: id,
          classId: homeroomClassId,
          isHomeroom: true,
        },
        update: { isHomeroom: true },
      });
    }

    // 如果设置了班主任，更新 teacherRole
    if (homeroomClassId && !teacherRole) {
      await prisma.teacher.update({
        where: { id },
        data: { teacherRole: "HOMEROOM" },
      });
    }

    // 重新查询完整数据
    const result = await prisma.teacher.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, id: true } },
        teacherClasses: { include: { class: { include: { grade: true } } } },
        _count: { select: { comments: true, teacherClasses: true } },
      },
    });

    return Response.json(result);
  } catch (error) {
    console.error("更新教师错误:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE - 删除教师
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
    const existing = await prisma.teacher.findUnique({
      where: { id },
    });
    if (!existing) {
      return Response.json({ error: "教师不存在" }, { status: 404 });
    }

    await prisma.teacher.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    console.error("删除教师错误:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 }
    );
  }
}
