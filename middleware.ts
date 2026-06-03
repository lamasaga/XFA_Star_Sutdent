import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

// 路由匹配规则
export const config = {
  matcher: [
    // 保护所有非公开页面
    "/dashboard/:path*",
    "/profile/:path*",
    "/assessments/:path*",
    "/milestones/:path*",
    "/activities/:path*",
    "/semester-reports/:path*",
    "/space/:path*",
    "/teacher/:path*",
    "/t/:path*",
    "/admin/:path*",
    "/a/:path*",
  ],
};

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // 未登录用户统一重定向到登录页
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const role = token.role as string;

    // 学生端路由保护
    if (
      pathname === "/profile" ||
      pathname === "/assessments" ||
      pathname === "/milestones" ||
      pathname === "/activities" ||
      pathname === "/semester-reports" ||
      pathname === "/space" ||
      pathname.startsWith("/profile/") ||
      pathname.startsWith("/assessments/") ||
      pathname.startsWith("/milestones/") ||
      pathname.startsWith("/activities/") ||
      pathname.startsWith("/semester-reports/") ||
      pathname.startsWith("/space/")
    ) {
      if (role !== "STUDENT") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // 教师端路由保护
    if (pathname.startsWith("/t/")) {
      if (role !== "TEACHER" && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // 管理端路由保护
    if (pathname.startsWith("/a/")) {
      if (role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized({ req, token }) {
        // 只要有 token 就算已授权，具体角色在 middleware 中检查
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);
