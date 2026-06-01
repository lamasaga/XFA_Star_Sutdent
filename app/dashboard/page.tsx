import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import dynamic from "next/dynamic";

// 延迟加载各角色的 Dashboard（减少首屏 bundle）
const StudentDashboard = dynamic(
  () =>
    import("@/components/dashboard/student-dashboard").then(
      (mod) => mod.StudentDashboard
    ),
  {
    loading: () => <DashboardSkeleton />,
    ssr: true,
  }
);

const TeacherDashboard = dynamic(
  () =>
    import("@/components/dashboard/teacher-dashboard").then(
      (mod) => mod.TeacherDashboard
    ),
  {
    loading: () => <DashboardSkeleton />,
    ssr: true,
  }
);

const AdminDashboard = dynamic(
  () =>
    import("@/components/dashboard/admin-dashboard").then(
      (mod) => mod.AdminDashboard
    ),
  {
    loading: () => <DashboardSkeleton />,
    ssr: true,
  }
);

// 加载骨架屏
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="h-80 bg-gray-100 rounded-xl" />
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
        <div className="space-y-5">
          <div className="h-40 bg-gray-100 rounded-xl" />
          <div className="h-48 bg-gray-100 rounded-xl" />
          <div className="h-40 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {role === "STUDENT" && (
        <StudentDashboard studentId={session.user.studentId!} />
      )}
      {role === "TEACHER" && (
        <TeacherDashboard teacherId={session.user.teacherId!} />
      )}
      {role === "ADMIN" && <AdminDashboard />}
    </Suspense>
  );
}
