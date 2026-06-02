import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CommentEditor } from "@/components/comment-editor";
import { redirect } from "next/navigation";

export default async function CommentsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.teacherId) {
    redirect("/login");
  }

  const teacherId = session.user.teacherId;
  const preselectedStudentId = typeof searchParams?.studentId === "string" ? searchParams.studentId : undefined;

  // 获取教师信息（含任教科目）
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { subjects: true },
  });

  const subjects: string[] = Array.isArray(teacher?.subjects) ? (teacher?.subjects as string[]) : [];

  // 获取教师负责的班级和学生
  const teacherClasses = await prisma.teacherClass.findMany({
    where: { teacherId },
    include: {
      class: {
        include: {
          grade: true,
          students: {
            where: { status: "ENROLLED" },
            orderBy: { name: "asc" },
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">写评语</h1>
        <p className="text-muted-foreground">为我的学生撰写评语，支持 AI 辅助生成</p>
      </div>

      <CommentEditor students={students} preselectedStudentId={preselectedStudentId} subjects={subjects} />
    </div>
  );
}
