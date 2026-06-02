/**
 * 六维分数计算器
 *
 * 核心公式（基于六维成长体系v3.1）：
 *   显示分 = 年级基准分 + 成长分
 *   成长分 = 底线分(0~36) + 表现分(0~12) + 卓越分(0~12)
 *   理论满分 = 年级基准分 + 60
 *
 * 数据来源：
 * - 底线分：由学生基础状态决定（默认36分）
 * - 表现分：由成绩、活动参与、心情记录等日常数据驱动
 * - 卓越分：由教师评语标签、里程碑、竞赛获奖等突出表现驱动
 */

import { prisma } from "./prisma";
import {
  SIX_DIMENSIONS,
  type DimensionKey,
  getGradeBenchmark,
} from "./dimension-utils";

// ==================== 分数配置 ====================

const MAX_BASE = 36;        // 底线分上限
const MAX_PERFORMANCE = 12; // 表现分上限
const MAX_EXCELLENCE = 12;  // 卓越分上限
const MAX_GROWTH = 60;      // 成长分上限 = 36 + 12 + 12

// 每个标签增加的卓越分
const TAG_EXCELLENCE_POINTS = 2;
// 每个维度每学期卓越分上限
const MAX_EXCELLENCE_PER_DIMENSION = 12;

// 成绩→表现分映射
const SCORE_PERFORMANCE_MAP = {
  excellent: 10,  // 排名前20%
  good: 7,        // 排名前50%
  average: 4,     // 排名前80%
  below: 1,       // 排名后20%
};

// ==================== 分数计算入口 ====================

/**
 * 计算学生的六维分数
 * 遍历所有数据源，汇总计算每个维度的底线分、表现分、卓越分
 */
export async function calculateStudentDimensions(
  studentId: string
): Promise<Record<DimensionKey, { score: number; breakdown: { base: number; performance: number; excellence: number } }>> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      class: { include: { grade: true } },
      careerProfile: true,
      scores: { orderBy: { examDate: "desc" } },
      comments: { orderBy: { createdAt: "desc" } },
      milestones: { where: { status: "APPROVED" } },
      activities: { where: { status: "APPROVED" } },
      moodEntries: { orderBy: { date: "desc" } },
    },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  const gradeName = student.class?.grade?.name || "高一";
  const benchmark = getGradeBenchmark(gradeName);

  // 初始化各维度分数
  const dimensions: Record<
    DimensionKey,
    { base: number; performance: number; excellence: number }
  > = {
    逻辑: { base: MAX_BASE, performance: 0, excellence: 0 },
    创新: { base: MAX_BASE, performance: 0, excellence: 0 },
    表达: { base: MAX_BASE, performance: 0, excellence: 0 },
    才情: { base: MAX_BASE, performance: 0, excellence: 0 },
    身心: { base: MAX_BASE, performance: 0, excellence: 0 },
    德行: { base: MAX_BASE, performance: 0, excellence: 0 },
  };

  // 1. 成绩 → 逻辑维度表现分
  await calculateScorePerformance(student.scores, dimensions);

  // 2. 评语标签 → 各维度卓越分
  await calculateCommentExcellence(student.comments, dimensions);

  // 3. 里程碑 → 各维度卓越分
  await calculateMilestoneExcellence(student.milestones, dimensions);

  // 4. 活动记录 → 相关维度表现分
  await calculateActivityPerformance(student.activities, dimensions);

  // 5. 心情记录 → 身心维度表现分
  await calculateMoodPerformance(student.moodEntries, dimensions);

  // 6. 封顶处理
  for (const dim of SIX_DIMENSIONS) {
    const d = dimensions[dim.key];
    d.performance = Math.min(MAX_PERFORMANCE, Math.round(d.performance));
    d.excellence = Math.min(MAX_EXCELLENCE, Math.round(d.excellence));
  }

  // 转换为最终分数格式
  const result = {} as Record<
    DimensionKey,
    { score: number; breakdown: { base: number; performance: number; excellence: number } }
  >;

  for (const dim of SIX_DIMENSIONS) {
    const d = dimensions[dim.key];
    const growth = d.base + d.performance + d.excellence;
    result[dim.key] = {
      score: benchmark + growth,
      breakdown: { ...d },
    };
  }

  return result;
}

// ==================== 各数据源计算 ====================

/**
 * 成绩 → 逻辑维度表现分
 * 根据成绩排名和分数计算
 */
function calculateScorePerformance(
  scores: Array<{ subject: string; score: number; total: number; classRank?: number | null }>,
  dimensions: Record<DimensionKey, { base: number; performance: number; excellence: number }>
): void {
  if (scores.length === 0) return;

  // 取最近3次考试
  const recentScores = scores.slice(0, 3);
  let totalPerformance = 0;

  for (const score of recentScores) {
    const ratio = score.score / score.total;
    let points = 0;

    if (ratio >= 0.9) points = 4;      // 90%以上
    else if (ratio >= 0.8) points = 3; // 80%以上
    else if (ratio >= 0.7) points = 2; // 70%以上
    else if (ratio >= 0.6) points = 1; // 60%以上

    totalPerformance += points;
  }

  // 平均每次考试的贡献，封顶
  const avgPerformance = totalPerformance / Math.max(1, recentScores.length);
  dimensions["逻辑"].performance += Math.min(MAX_PERFORMANCE, avgPerformance * 2);
}

/**
 * 评语标签 → 各维度卓越分
 */
function calculateCommentExcellence(
  comments: Array<{ dimensions: string | null; createdAt: Date }>,
  dimensions: Record<DimensionKey, { base: number; performance: number; excellence: number }>
): void {
  // 统计每个维度的标签数量（当前学期）
  const semester = getCurrentSemester();
  const tagCounts: Record<string, number> = {};

  for (const comment of comments) {
    if (!comment.dimensions) continue;

    try {
      const dimTags = JSON.parse(comment.dimensions) as Record<string, string[]>;
      for (const [dim, tags] of Object.entries(dimTags)) {
        if (!tagCounts[dim]) tagCounts[dim] = 0;
        tagCounts[dim] += (tags as string[]).length;
      }
    } catch {
      // 忽略解析错误
    }
  }

  for (const [dim, count] of Object.entries(tagCounts)) {
    if (dim in dimensions) {
      const points = Math.min(
        MAX_EXCELLENCE,
        count * TAG_EXCELLENCE_POINTS
      );
      dimensions[dim as DimensionKey].excellence += points;
    }
  }
}

/**
 * 里程碑 → 各维度卓越分
 */
function calculateMilestoneExcellence(
  milestones: Array<{ type: string; title: string }>,
  dimensions: Record<DimensionKey, { base: number; performance: number; excellence: number }>
): void {
  for (const milestone of milestones) {
    // 根据里程碑类型映射到维度
    const dimMap: Record<string, DimensionKey[]> = {
      ACADEMIC: ["逻辑"],
      COMPETITION: ["创新", "才情"],
      ACTIVITY: ["德行", "身心"], // 社交已改为德行
      PSYCHOLOGY: ["身心"],
      PERSONAL: ["德行"],
      GROWTH: ["德行"],
    };

    const mapped = dimMap[milestone.type];
    if (mapped) {
      for (const dim of mapped) {
        if (dimensions[dim]) {
          dimensions[dim].excellence += 3; // 每个里程碑+3分
        }
      }
    }
  }
}

/**
 * 活动记录 → 相关维度表现分
 */
function calculateActivityPerformance(
  activities: Array<{ category: string; points: number }>,
  dimensions: Record<DimensionKey, { base: number; performance: number; excellence: number }>
): void {
  for (const activity of activities) {
    // 根据活动类别映射到维度
    const catMap: Record<string, DimensionKey[]> = {
      CLUB: ["创新", "才情"],
      VOLUNTEER: ["德行"],
      STUDY_TOUR: ["表达", "逻辑"],
      COMPETITION: ["创新", "逻辑", "才情"],
      SPORTS: ["身心"],
      OTHER: ["德行"],
    };

    const mapped = catMap[activity.category];
    if (mapped) {
      for (const dim of mapped) {
        if (dimensions[dim]) {
          dimensions[dim].performance += Math.min(2, activity.points / 10);
        }
      }
    }
  }
}

/**
 * 心情记录 → 身心维度表现分
 */
function calculateMoodPerformance(
  moodEntries: Array<{ rating: number; date: Date }>,
  dimensions: Record<DimensionKey, { base: number; performance: number; excellence: number }>
): void {
  if (moodEntries.length === 0) return;

  // 最近30天的心情记录
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recent = moodEntries.filter((m) => m.date >= thirtyDaysAgo);

  if (recent.length === 0) return;

  const avgRating =
    recent.reduce((sum, m) => sum + m.rating, 0) / recent.length;

  // 平均评分越高，表现分越高
  let points = 0;
  if (avgRating >= 4.5) points = 4;
  else if (avgRating >= 4.0) points = 3;
  else if (avgRating >= 3.5) points = 2;
  else if (avgRating >= 3.0) points = 1;

  // 连续记录 bonus
  const consistencyBonus = Math.min(3, recent.length / 7); // 每周最多+1

  dimensions["身心"].performance += points + consistencyBonus;
}

// ==================== 工具函数 ====================

/**
 * 获取当前学期标识
 * 如 "2025-2026-1" 或 "2025-2026-2"
 */
export function getCurrentSemester(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  // 中国学期划分：9月-1月为第一学期，2月-7月为第二学期
  if (month >= 9 || month <= 1) {
    return `${year}-${year + 1}-1`;
  } else {
    return `${year - 1}-${year}-2`;
  }
}

/**
 * 保存计算后的六维分数到数据库
 */
export async function saveDimensionScores(
  studentId: string,
  scores: Record<DimensionKey, { score: number; breakdown: { base: number; performance: number; excellence: number } }>
): Promise<void> {
  const scoreJson = JSON.stringify(
    Object.fromEntries(
      Object.entries(scores).map(([dim, data]) => [dim, data.score])
    )
  );

  await prisma.careerProfile.upsert({
    where: { studentId },
    create: {
      studentId,
      sixDimensions: scoreJson,
      dimensionHistory: JSON.stringify([]),
      totalScore: Object.values(scores).reduce((sum, d) => sum + d.score, 0),
      unlockedItems: JSON.stringify([]),
    },
    update: {
      sixDimensions: scoreJson,
      totalScore: Object.values(scores).reduce((sum, d) => sum + d.score, 0),
    },
  });
}

/**
 * 触发单个学生的六维分数重算并保存
 * 在成绩录入、评语提交、里程碑审核等操作后调用
 */
export async function refreshStudentDimensions(studentId: string): Promise<void> {
  const scores = await calculateStudentDimensions(studentId);
  await saveDimensionScores(studentId, scores);
}
