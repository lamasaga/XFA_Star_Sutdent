import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardNav, Breadcrumb } from "@/components/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-[#f0f4f8]">
      <DashboardNav role={session.user.role} userName={session.user.name || ""} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1200px] mx-auto px-8 py-8">
          <Breadcrumb />
          <div className="mt-4">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
