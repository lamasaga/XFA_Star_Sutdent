/**
 * 服务端数据缓存工具
 * 使用 React.cache 实现请求级缓存（Server Components 内有效）
 * 使用 unstable_cache 实现跨请求缓存
 */

import { cache } from "react";
import { unstable_cache } from "next/cache";

// 缓存标签常量（用于 revalidate）
export const CACHE_TAGS = {
  student: (id: string) => `student:${id}`,
  studentProfile: (id: string) => `student-profile:${id}`,
  comments: (studentId: string) => `comments:${studentId}`,
  scores: (studentId: string) => `scores:${studentId}`,
  milestones: (studentId: string) => `milestones:${studentId}`,
  activities: (studentId: string) => `activities:${studentId}`,
  assessments: (studentId: string) => `assessments:${studentId}`,
  classAverage: (classId: string) => `class-average:${classId}`,
  teacherStudents: (teacherId: string) => `teacher-students:${teacherId}`,
  dashboard: (userId: string) => `dashboard:${userId}`,
  allStudents: "students:all",
  allTeachers: "teachers:all",
} as const;

/**
 * 请求级缓存（Server Component 单次请求内有效）
 * 适合：同一次渲染中多次调用同一查询
 */
export const cachedQuery = cache(
  async <T>(queryFn: () => Promise<T>): Promise<T> => {
    return queryFn();
  }
);

/**
 * 跨请求缓存（带标签和过期时间）
 * 适合：不频繁变化的数据（如班级平均分、学生基本信息）
 *
 * @param key 缓存键
 * @param fn 查询函数
 * @param tags 缓存标签（用于 revalidate）
 * @param revalidate 缓存有效期（秒）
 */
export function createCachedQuery<T, Args extends unknown[]>(
  keyPrefix: string,
  fn: (...args: Args) => Promise<T>,
  options: {
    tags?: ((...args: Args) => string[]) | string[];
    revalidate?: number;
  } = {}
) {
  const { tags = [], revalidate = 60 } = options;

  return async (...args: Args): Promise<T> => {
    const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;
    const cacheTags =
      typeof tags === "function" ? tags(...args) : tags;

    return unstable_cache(
      async () => fn(...args),
      [cacheKey],
      {
        tags: cacheTags,
        revalidate,
      }
    )();
  };
}

/**
 * 手动使缓存失效
 * 在数据变更后调用（需在 Server Action 或 Route Handler 中使用）
 */
export async function revalidateCache(tags: string[]) {
  try {
    const { revalidateTag } = await import("next/cache");
    for (const tag of tags) {
      revalidateTag(tag, "page");
    }
  } catch {
    // 如果在非 Next.js 环境运行，静默失败
  }
}
