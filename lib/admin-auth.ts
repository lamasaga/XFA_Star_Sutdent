/**
 * 管理端权限检查工具
 */

import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextRequest } from "next/server";

export async function requireAdmin(req?: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Forbidden: Admin only");
  }

  return session;
}

export function adminHandler(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest): Promise<Response> => {
    try {
      await requireAdmin(req);
      return await handler(req);
    } catch (error) {
      if (error instanceof Error && error.message.includes("Forbidden")) {
        return Response.json({ error: "无权访问" }, { status: 403 });
      }
      console.error("Admin API error:", error);
      return Response.json({ error: "服务器错误" }, { status: 500 });
    }
  };
}
