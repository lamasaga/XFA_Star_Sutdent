import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateTodos } from "@/lib/todo-generator";

// GET /api/students/me/todos
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.studentId) {
    return Response.json({ error: "未登录或非学生用户" }, { status: 401 });
  }

  try {
    const todos = await generateTodos(session.user.studentId);
    return Response.json({ todos });
  } catch (error) {
    console.error("获取待办错误:", error);
    return Response.json({ error: "获取失败" }, { status: 500 });
  }
}
