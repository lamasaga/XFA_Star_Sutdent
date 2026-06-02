import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - 获取当前教师信息
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.teacherId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: session.user.teacherId },
      select: {
        id: true,
        name: true,
        title: true,
        subjects: true,
        teacherRole: true,
      },
    });

    if (!teacher) {
      return Response.json({ error: "教师不存在" }, { status: 404 });
    }

    return Response.json({
      teacher: {
        id: teacher.id,
        name: teacher.name,
        title: teacher.title,
        subjects: teacher.subjects,
        role: teacher.teacherRole,
        teacherRole: teacher.teacherRole,
      },
    });
  } catch (error) {
    console.error("获取教师信息错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}
