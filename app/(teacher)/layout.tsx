import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TeacherLayoutClient } from "@/components/teacher/teacher-layout-client";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "TEACHER") {
    redirect("/login");
  }

  // 获取教师基本信息
  const teacher = await prisma.teacher.findUnique({
    where: { id: session.user.teacherId! },
    select: {
      name: true,
      teacherRole: true,
      title: true,
    },
  });

  if (!teacher) {
    redirect("/login");
  }

  const user = {
    name: teacher.name,
    role: teacher.teacherRole,
    title: teacher.title || undefined,
  };

  return <TeacherLayoutClient user={user}>{children}</TeacherLayoutClient>;
}
