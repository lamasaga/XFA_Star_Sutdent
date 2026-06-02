import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

// 角色常量
const ADMIN = 'ADMIN';
const TEACHER = 'TEACHER';
const STUDENT = 'STUDENT';

// 统一的会话获取
export async function getSession() {
  return getServerSession(authOptions);
}

// 检查是否已登录
export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  return session;
}

// 检查角色权限
export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth();
  if (!allowedRoles.includes(session.user.role)) {
    throw new Error('Forbidden');
  }
  return session;
}

// 快捷角色检查
export async function requireAdmin() {
  return requireRole([ADMIN]);
}

export async function requireTeacher() {
  return requireRole([TEACHER, ADMIN]);
}

export async function requireStudent() {
  return requireRole([STUDENT, ADMIN]);
}

// API Route 用的响应式错误处理
export function unauthorizedResponse() {
  return Response.json({ error: '未登录' }, { status: 401 });
}

export function forbiddenResponse() {
  return Response.json({ error: '无权限' }, { status: 403 });
}

// 检查学生是否只能访问自己的数据
export function canAccessStudent(session: Awaited<ReturnType<typeof getSession>>, studentId: string): boolean {
  if (!session?.user) return false;
  if (session.user.role === ADMIN) return true;
  // 学生只能访问自己的数据
  if (session.user.role === STUDENT && session.user.studentId === studentId) return true;
  return false;
}

// 检查教师是否有权访问某学生（API路由用）
export async function canTeacherAccessStudent(
  session: Awaited<ReturnType<typeof getSession>>,
  studentId: string
): Promise<boolean> {
  if (!session?.user || !session.user.teacherId) return false;

  // 心理老师可以看全校
  if (session.user.teacherRole === "PSYCHOLOGY") return true;

  const { prisma } = await import("./prisma");

  const tcs = await prisma.teacherClass.findMany({
    where: { teacherId: session.user.teacherId },
    select: { classId: true },
  });
  const classIds = tcs.map((tc) => tc.classId);

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { classId: true },
  });

  return student ? classIds.includes(student.classId) : false;
}
