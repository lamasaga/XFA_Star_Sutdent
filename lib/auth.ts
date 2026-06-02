import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// 仅在开发环境输出日志
const isDev = process.env.NODE_ENV === "development";
const devLog = (...args: unknown[]) => {
  if (isDev) console.log(...args);
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        devLog("[AUTH] authorize called with email:", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          devLog("[AUTH] Missing credentials");
          return null;
        }

        try {
          // 使用 select 减少查询字段，提升认证速度
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              role: true,
              student: {
                select: {
                  id: true,
                  classId: true,
                },
              },
              teacher: {
                select: {
                  id: true,
                  teacherRole: true,
                },
              },
            },
          });

          devLog("[AUTH] User found:", user ? "yes" : "no");

          if (!user || !user.password) {
            devLog("[AUTH] User not found or no password");
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
          devLog("[AUTH] Password valid:", isValid);

          if (!isValid) {
            return null;
          }

          const result = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            studentId: user.student?.id,
            teacherId: user.teacher?.id,
            teacherRole: user.teacher?.teacherRole,
            classId: user.student?.classId,
          };
          devLog("[AUTH] Returning user:", result);
          return result;
        } catch (error) {
          // 生产环境只记录错误，不泄露细节
          if (isDev) {
            console.error("[AUTH] Error in authorize:", error);
          } else {
            console.error("[AUTH] Authentication failed");
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.studentId = user.studentId;
        token.teacherId = user.teacherId;
        token.teacherRole = user.teacherRole;
        token.classId = user.classId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.studentId = token.studentId as string | undefined;
        session.user.teacherId = token.teacherId as string | undefined;
        session.user.teacherRole = token.teacherRole as string | undefined;
        session.user.classId = token.classId as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30天
    updateAge: 24 * 60 * 60,   // 24小时更新一次会话
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: isDev,
  // JWT 配置优化
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
};
