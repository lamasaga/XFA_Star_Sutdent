import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET - 获取单个学生详情
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
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        class: { include: { grade: true } },
        user: { select: { email: true, id: true } },
        _count: {
          select: { comments: true, scores: true, activities: true, milestones: true },
        },
      },
    });

    if (!student) {
      return Response.json({ error: "学生不存在" }, { status: 404 });
    }

    return Response.json(student);
  } catch (error) {
    console.error("获取学生详情错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}

// PUT - 更新学生信息
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
      studentNo,
      email,
      password,
      gender,
      classId,
      graduationYear,
      enrollmentDate,
      status,
    } = body;

    const existing = await prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) {
      return Response.json({ error: "学生不存在" }, { status: 404 });
    }

    // 检查学号是否与其他学生冲突
    if (studentNo && studentNo !== existing.studentNo) {
      const conflict = await prisma.student.findUnique({
        where: { studentNo },
      });
      if (conflict && conflict.id !== id) {
        return Response.json({ error: "学号已存在" }, { status: 409 });
      }
    }

    // 检查邮箱是否与其他用户冲突
    if (email && email !== existing.user.email) {
      const conflict = await prisma.user.findUnique({
        where: { email },
      });
      if (conflict && conflict.id !== existing.userId) {
        return Response.json({ error: "邮箱已存在" }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name;
    if (studentNo) updateData.studentNo = studentNo;
    if (gender) updateData.gender = gender;
    if (classId) updateData.classId = classId;
    if (graduationYear) updateData.graduationYear = parseInt(graduationYear, 10);
    if (enrollmentDate) updateData.enrollmentDate = new Date(enrollmentDate);
    if (status) updateData.status = status;

    const userUpdateData: Record<string, unknown> = {};
    if (name) userUpdateData.name = name;
    if (email) userUpdateData.email = email;
    if (password) userUpdateData.password = await bcrypt.hash(password, 10);

    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...updateData,
        user: { update: userUpdateData },
      },
      include: {
        class: { include: { grade: true } },
        user: { select: { email: true, id: true } },
      },
    });

    return Response.json(updated);
  } catch (error) {
    console.error("更新学生错误:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE - 删除学生（级联删除 User）
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
    const existing = await prisma.student.findUnique({
      where: { id },
    });
    if (!existing) {
      return Response.json({ error: "学生不存在" }, { status: 404 });
    }

    // Prisma onDelete: Cascade 会自动删除关联的 User
    await prisma.student.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    console.error("删除学生错误:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "删除失败" },
      { status: 500 }
    );
  }
}
