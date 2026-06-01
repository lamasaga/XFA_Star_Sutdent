import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.teacherId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacherId = session.user.teacherId;

  try {
    // 获取教师负责的班级
    const teacherClasses = await prisma.teacherClass.findMany({
      where: { teacherId },
      include: {
        class: {
          include: {
            grade: true,
            students: {
              where: { status: "ENROLLED" },
              orderBy: { name: "asc" },
              // 添加分页支持
              take: 200,
              select: {
                id: true,
                name: true,
                studentNo: true,
              },
            },
          },
        },
      },
    });

    const students = teacherClasses.flatMap((tc) =>
      tc.class.students.map((s) => ({
        id: s.id,
        name: s.name,
        studentNo: s.studentNo,
        className: `${tc.class.grade.name}${tc.class.name}`,
        isHomeroom: tc.isHomeroom,
      }))
    );

    return Response.json({
      students,
      classes: teacherClasses.map((tc) => ({
        id: tc.class.id,
        name: `${tc.class.grade.name}${tc.class.name}`,
        isHomeroom: tc.isHomeroom,
      })),
    });
  } catch (error) {
    console.error("获取教师数据错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}
