import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - 获取当前学生的完整档案
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.studentId) {
    return Response.json({ error: "未登录或非学生用户" }, { status: 401 });
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: session.user.studentId },
      include: {
        class: {
          include: { grade: true },
        },
        careerProfile: true,
        user: {
          select: { email: true, avatar: true },
        },
      },
    });

    if (!student) {
      return Response.json({ error: "未找到学生信息" }, { status: 404 });
    }

    return Response.json({ student });
  } catch (error) {
    console.error("获取学生档案错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}
