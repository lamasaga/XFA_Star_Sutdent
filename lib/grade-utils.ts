/**
 * 年级/班级自动升级工具
 * 根据 graduationYear（毕业年份）和当前时间自动计算学生所在年级
 *
 * 规则：
 * - "2028级"表示2028年高三毕业
 * - 2025年9月~2026年8月 = 高一（graduationYear - academicYear = 3）
 * - 2026年9月~2027年8月 = 高二（graduationYear - academicYear = 2）
 * - 2027年9月~2028年6月 = 高三（graduationYear - academicYear = 1）
 */

export interface GradeLevelInfo {
  level: number; // 1=高一, 2=高二, 3=高三
  name: string;
  academicYear: number; // 当前学年（如2025表示2025-2026学年）
}

/**
 * 根据毕业年份计算当前年级信息
 */
export function getGradeLevelByGraduationYear(graduationYear: number): GradeLevelInfo {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11, 8=September

  // 学年计算：9月为新学年开始
  // 如果当前月份 >= 8（9月或之后），新学年已开始
  const academicYear = currentMonth >= 8 ? currentYear : currentYear - 1;

  // gradeLevel: 3=高一, 2=高二, 1=高三
  const level = graduationYear - academicYear;

  const nameMap: Record<number, string> = {
    3: "高一",
    2: "高二",
    1: "高三",
  };

  return {
    level: Math.max(1, Math.min(3, level)),
    name: nameMap[level] || (level > 3 ? "未入学" : "已毕业"),
    academicYear,
  };
}

/**
 * 获取当前学年
 */
export function getCurrentAcademicYear(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 8 ? year : year - 1;
}

/**
 * 计算入学年份（高中3年制）
 */
export function getEnrollmentYear(graduationYear: number): number {
  return graduationYear - 3;
}

/**
 * 根据年级名称获取 level
 */
export function getLevelByGradeName(name: string): number {
  const map: Record<string, number> = {
    "高一": 1,
    "高二": 2,
    "高三": 3,
  };
  return map[name] || 1;
}
