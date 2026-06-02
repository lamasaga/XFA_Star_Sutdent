/**
 * 教师权限体系
 * 基于教师子角色（teacherRole）和任教科目（subjects）进行细粒度权限控制
 *
 * 核心原则：
 * - 所有教师都能打"德行"维度标签（全员育人）
 * - 学科教师只能打与自己科目相关的维度标签
 * - 班主任/心理老师/管理员拥有更广泛的权限
 * - 心理老师可以看全校学生，其他教师只能看自己所教班级
 */

import { prisma } from "./prisma";

// ==================== 教师子角色 ====================

export type TeacherSubRole =
  | "ADMIN"
  | "HOMEROOM"
  | "SUBJECT"
  | "PSYCHOLOGY"
  | "CAREER";

// ==================== 科目 → 维度映射 ====================

/**
 * 科目到可维护维度的映射
 * 每个科目教师除了"德行"外，还可以维护与自己科目相关的维度
 */
export const SUBJECT_DIMENSION_MAP: Record<string, string[]> = {
  语文: ["表达", "德行"],
  数学: ["逻辑", "德行"],
  英语: ["表达", "德行"],
  物理: ["逻辑", "创新", "德行"],
  化学: ["逻辑", "德行"],
  生物: ["逻辑", "德行"],
  美术: ["才情", "德行"],
  音乐: ["才情", "德行"],
  体育: ["身心", "德行"],
  心理: ["身心", "德行"],
  科创: ["创新", "逻辑", "德行"],
  信息技术: ["创新", "逻辑", "德行"],
  历史: ["逻辑", "德行"],
  地理: ["逻辑", "德行"],
  政治: ["德行"],
};

/**
 * 维度到维护科目的反向映射（用于提示教师）
 */
export const DIMENSION_MAINTAINERS: Record<string, string[]> = {
  逻辑: ["数学", "物理", "化学", "生物", "科创", "信息技术", "历史", "地理"],
  创新: ["物理", "科创", "信息技术"],
  表达: ["语文", "英语"],
  才情: ["美术", "音乐"],
  身心: ["体育", "心理"],
  德行: ["任意科目"],
};

// ==================== 维度标签配置 ====================

export interface DimensionTagConfig {
  key: string;
  color: string;
  bgColor: string;
  tags: string[];
}

export const DIMENSION_TAGS_CONFIG: DimensionTagConfig[] = [
  {
    key: "逻辑",
    color: "#dc2626",
    bgColor: "#fee2e2",
    tags: ["思维活跃", "逻辑清晰", "善于推理"],
  },
  {
    key: "创新",
    color: "#0891b2",
    bgColor: "#cffafe",
    tags: ["有创意", "动手能力强"],
  },
  {
    key: "表达",
    color: "#9333ea",
    bgColor: "#f3e8ff",
    tags: ["表达清晰", "有感染力", "善于辩论"],
  },
  {
    key: "才情",
    color: "#ca8a04",
    bgColor: "#fef9c3",
    tags: ["有审美力", "艺术天赋"],
  },
  {
    key: "身心",
    color: "#16a34a",
    bgColor: "#dcfce7",
    tags: ["运动能力强", "毅力坚强", "情绪稳定", "适应良好"],
  },
  {
    key: "德行",
    color: "#2563eb",
    bgColor: "#dbeafe",
    tags: ["责任心强", "乐于助人", "遵守纪律", "尊重师长", "诚信正直"],
  },
];

// ==================== 权限查询函数 ====================

/**
 * 获取教师可操作的维度标签
 * 所有教师都可以打"德行"标签
 */
export function getTeacherDimensions(subjects: string[]): string[] {
  const dims = new Set<string>(["德行"]);
  for (const subject of subjects) {
    const mapped = SUBJECT_DIMENSION_MAP[subject];
    if (mapped) mapped.forEach((d) => dims.add(d));
  }
  return Array.from(dims);
}

/**
 * 获取教师可操作的维度标签配置（完整对象）
 */
export function getTeacherDimensionTags(
  subjects: string[]
): DimensionTagConfig[] {
  const allowedDims = new Set(getTeacherDimensions(subjects));
  return DIMENSION_TAGS_CONFIG.map((dim) => ({
    ...dim,
    // 标记该维度是否可用
    tags: dim.tags,
  })).filter((dim) => allowedDims.has(dim.key));
}

/**
 * 判断教师是否可以操作某维度
 */
export function canTeacherTagDimension(
  subjects: string[],
  dimension: string
): boolean {
  if (dimension === "德行") return true;
  return getTeacherDimensions(subjects).includes(dimension);
}

/**
 * 获取维度的维护者提示文字
 */
export function getDimensionMaintainerHint(dimension: string): string {
  const maintainers = DIMENSION_MAINTAINERS[dimension];
  if (!maintainers) return "";
  return `该维度标签由${maintainers.join("、")}老师维护`;
}

// ==================== 学生访问范围控制 ====================

/**
 * 获取教师负责的班级ID列表
 */
export async function getTeacherClassIds(
  teacherId: string
): Promise<string[]> {
  const tcs = await prisma.teacherClass.findMany({
    where: { teacherId },
    select: { classId: true },
  });
  return tcs.map((tc) => tc.classId);
}

/**
 * 检查教师是否是某学生的班主任
 */
export async function isTeacherHomeroomOfStudent(
  teacherId: string,
  studentId: string
): Promise<boolean> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { classId: true },
  });
  if (!student) return false;

  const tc = await prisma.teacherClass.findUnique({
    where: {
      teacherId_classId: {
        teacherId,
        classId: student.classId,
      },
    },
    select: { isHomeroom: true },
  });

  return tc?.isHomeroom ?? false;
}

/**
 * 检查教师是否可以访问某学生
 * 规则：
 * - 管理员/心理老师：可以看全校
 * - 班主任/学科教师：只能看自己所教班级的学生
 */
export async function canTeacherAccessStudent(
  teacherId: string,
  teacherRole: string,
  studentId: string
): Promise<boolean> {
  // 心理老师可以看全校学生
  if (teacherRole === "PSYCHOLOGY") return true;

  const classIds = await getTeacherClassIds(teacherId);
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { classId: true },
  });

  return student ? classIds.includes(student.classId) : false;
}

/**
 * 检查教师是否可以查看学生的心理数据详情
 * 规则：只有心理老师可以看详情
 */
export function canTeacherViewPsychDetails(teacherRole: string): boolean {
  return teacherRole === "PSYCHOLOGY" || teacherRole === "ADMIN";
}

/**
 * 检查教师是否可以查看学生的心情日记内容
 * 规则：只有心理老师可以看具体内容
 */
export function canTeacherViewMoodNotes(teacherRole: string): boolean {
  return teacherRole === "PSYCHOLOGY" || teacherRole === "ADMIN";
}

/**
 * 检查教师是否可以发起学生互评
 * 规则：只有班主任可以
 */
export function canTeacherInitiatePeerReview(
  teacherRole: string,
  isHomeroom: boolean
): boolean {
  return teacherRole === "HOMEROOM" || teacherRole === "ADMIN";
}

/**
 * 检查教师是否可以审核里程碑
 * 规则：班主任和相关学科老师可以审核
 */
export function canTeacherReviewMilestone(
  teacherRole: string,
  isHomeroom: boolean
): boolean {
  return (
    isHomeroom || teacherRole === "ADMIN" || teacherRole === "HOMEROOM"
  );
}

/**
 * 检查教师是否可以生成报告
 * 规则：班主任和管理员
 */
export function canTeacherGenerateReports(teacherRole: string): boolean {
  return teacherRole === "HOMEROOM" || teacherRole === "ADMIN";
}

// ==================== 导航权限 ====================

/**
 * 获取教师可见的导航项
 */
export function getTeacherNavItems(teacherRole: string): string[] {
  const common = [
    "/teacher",
    "/t/students",
    "/t/comments",
    "/t/warnings",
    "/t/data-entry",
  ];

  const restricted = ["/t/reports", "/t/review"];

  if (
    teacherRole === "ADMIN" ||
    teacherRole === "HOMEROOM"
  ) {
    return [...common, ...restricted];
  }

  return common;
}
