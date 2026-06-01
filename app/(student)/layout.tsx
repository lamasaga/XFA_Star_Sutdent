import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudentLayoutClient } from "@/components/student-layout-client";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "STUDENT") {
    redirect("/login");
  }

  // 获取学生基本信息（只取需要的字段，轻量查询）
  const student = await prisma.student.findUnique({
    where: { id: session.user.studentId! },
    select: {
      name: true,
      studentNo: true,
      class: {
        select: {
          name: true,
          grade: { select: { name: true } },
        },
      },
      careerProfile: {
        select: { level: true, totalScore: true },
      },
    },
  });

  if (!student) {
    redirect("/login");
  }

  const user = {
    name: student.name,
    studentNo: student.studentNo || undefined,
    className: student.class
      ? `${student.class.grade.name} · ${student.class.name}`
      : undefined,
    level: student.careerProfile?.level || 1,
    points: student.careerProfile?.totalScore || 0,
  };

  return <StudentLayoutClient user={user}>{children}</StudentLayoutClient>;
}
