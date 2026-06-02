/**
 * 预警检测逻辑
 * 定时或手动调用检测学生是否需要预警
 *
 * 预警类型：
 * - PSYCHOLOGY（心理预警）：Assessment.riskLevel === "WARNING"
 * - IMBALANCE（偏科预警）：某维度分数 < 理论满分65%，或六维标准差 > 15
 * - DECAY（衰减预警）：某维度连续两学期下降
 * - DISCIPLINE（纪律预警）：暂留空实现（需要考勤数据）
 * - LOW_ENGAGEMENT（低参与预警）：某维度卓越分为0且表现分 < 3
 */

import { prisma } from "./prisma";
import { getGradeBenchmark, SIX_DIMENSIONS, type DimensionKey } from "./dimension-utils";

// ==================== 类型定义 ====================

export type WarningType = "PSYCHOLOGY" | "IMBALANCE" | "DECAY" | "DISCIPLINE" | "LOW_ENGAGEMENT";
export type WarningSeverity = "HIGH" | "MEDIUM" | "LOW" | "INFO";

interface SixDimensionJson {
  [key: string]: number;
}

interface DimensionHistoryEntry {
  semester: string;
  scores: Record<string, number>;
}

// ==================== 主入口 ====================

/**
 * 检测所有类型的预警
 * @param classIds 可选，指定班级ID列表，不传则检测全校
 */
export async function detectWarnings(classIds?: string[]): Promise<void> {
  await Promise.all([
    detectPsychologyWarnings(classIds),
    detectImbalanceWarnings(classIds),
    detectDecayWarnings(classIds),
    detectLowEngagementWarnings(classIds),
    // DISCIPLINE 暂留空实现
  ]);
}

// ==================== 心理预警 ====================

/**
 * 检测心理预警
 * 规则：Assessment.riskLevel === "WARNING"
 */
export async function detectPsychologyWarnings(classIds?: string[]): Promise<void> {
  const where: Record<string, unknown> = {
    riskLevel: "WARNING",
  };

  if (classIds && classIds.length > 0) {
    where.student = { classId: { in: classIds } };
  }

  const assessments = await prisma.assessment.findMany({
    where,
    include: {
      student: { select: { id: true, name: true } },
    },
  });

  for (const assessment of assessments) {
    const exists = await prisma.warning.findFirst({
      where: {
        studentId: assessment.studentId,
        type: "PSYCHOLOGY",
        status: { in: ["PENDING", "PROCESSING", "OBSERVING"] },
      },
    });

    if (!exists) {
      await prisma.warning.create({
        data: {
          studentId: assessment.studentId,
          type: "PSYCHOLOGY",
          severity: "HIGH",
          description: `心理测评「${assessment.scaleName}」显示风险等级为 WARNING，得分 ${assessment.score ?? "未知"}`,
          triggeredAt: new Date(),
          status: "PENDING",
        },
      });
    }
  }
}

// ==================== 偏科预警 ====================

/**
 * 检测偏科预警
 * 规则：某维度显示分 < 理论满分 × 65%，或六维标准差 > 15（基于归一化后的成长分）
 */
export async function detectImbalanceWarnings(classIds?: string[]): Promise<void> {
  const students = await prisma.student.findMany({
    where: classIds && classIds.length > 0 ? { classId: { in: classIds } } : undefined,
    include: {
      class: { include: { grade: true } },
      careerProfile: true,
    },
  });

  for (const student of students) {
    if (!student.careerProfile?.sixDimensions) continue;

    const dimensions: SixDimensionJson = JSON.parse(student.careerProfile.sixDimensions);
    const benchmark = getGradeBenchmark(student.class.grade.name);
    const theoryMax = benchmark + 60;
    const threshold = theoryMax * 0.65;

    // 检查是否有维度低于65%阈值
    const weakDimensions: string[] = [];
    const normalizedScores: number[] = [];

    for (const dim of SIX_DIMENSIONS) {
      const score = dimensions[dim.key];
      if (score === undefined) continue;

      if (score < threshold) {
        weakDimensions.push(`${dim.key}(${score.toFixed(1)})`);
      }

      // 归一化到 0-100 用于计算标准差
      normalizedScores.push(Math.min(100, Math.max(0, ((score - benchmark) / 60) * 100)));
    }

    // 计算标准差
    let stdDev = 0;
    if (normalizedScores.length === 6) {
      const mean = normalizedScores.reduce((a, b) => a + b, 0) / normalizedScores.length;
      const variance = normalizedScores.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / normalizedScores.length;
      stdDev = Math.sqrt(variance);
    }

    const descriptions: string[] = [];
    if (weakDimensions.length > 0) {
      descriptions.push(`以下维度低于理论满分65%(${threshold.toFixed(1)})：${weakDimensions.join("、")}`);
    }
    if (stdDev > 15) {
      descriptions.push(`六维发展不均衡，标准差为 ${stdDev.toFixed(1)}（>15）`);
    }

    if (descriptions.length === 0) continue;

    // 判断严重程度
    let severity: WarningSeverity = "MEDIUM";
    if (weakDimensions.length >= 3 || stdDev > 25) {
      severity = "HIGH";
    } else if (weakDimensions.length === 1 && stdDev <= 20) {
      severity = "LOW";
    }

    const exists = await prisma.warning.findFirst({
      where: {
        studentId: student.id,
        type: "IMBALANCE",
        status: { in: ["PENDING", "PROCESSING", "OBSERVING"] },
      },
    });

    if (!exists) {
      await prisma.warning.create({
        data: {
          studentId: student.id,
          type: "IMBALANCE",
          severity,
          description: descriptions.join("；"),
          triggeredAt: new Date(),
          status: "PENDING",
        },
      });
    }
  }
}

// ==================== 衰减预警 ====================

/**
 * 检测衰减预警
 * 规则：某维度连续两学期下降（比较最近三个学期的数据）
 */
export async function detectDecayWarnings(classIds?: string[]): Promise<void> {
  const students = await prisma.student.findMany({
    where: classIds && classIds.length > 0 ? { classId: { in: classIds } } : undefined,
    include: {
      class: { include: { grade: true } },
      careerProfile: true,
    },
  });

  for (const student of students) {
    if (!student.careerProfile?.dimensionHistory) continue;

    const history: DimensionHistoryEntry[] = JSON.parse(student.careerProfile.dimensionHistory);
    if (history.length < 3) continue;

    // 按学期排序，取最近三个学期
    const sorted = [...history].sort((a, b) => b.semester.localeCompare(a.semester));
    const recent = sorted.slice(0, 3);

    const decayingDimensions: string[] = [];

    for (const dim of SIX_DIMENSIONS) {
      const scores = recent.map((h) => h.scores?.[dim.key]).filter((s): s is number => s !== undefined);
      if (scores.length < 3) continue;

      // 连续两学期下降：s0 > s1 > s2
      if (scores[0] < scores[1] && scores[1] < scores[2]) {
        const totalDrop = scores[2] - scores[0];
        decayingDimensions.push(`${dim.key}(下降${totalDrop.toFixed(1)})`);
      }
    }

    if (decayingDimensions.length === 0) continue;

    // 判断严重程度
    let severity: WarningSeverity = "MEDIUM";
    if (decayingDimensions.length >= 3) {
      severity = "HIGH";
    } else if (decayingDimensions.length === 1) {
      severity = "LOW";
    }

    const exists = await prisma.warning.findFirst({
      where: {
        studentId: student.id,
        type: "DECAY",
        status: { in: ["PENDING", "PROCESSING", "OBSERVING"] },
      },
    });

    if (!exists) {
      await prisma.warning.create({
        data: {
          studentId: student.id,
          type: "DECAY",
          severity,
          description: `以下维度连续两学期下降：${decayingDimensions.join("、")}`,
          triggeredAt: new Date(),
          status: "PENDING",
        },
      });
    }
  }
}

// ==================== 纪律预警 ====================

/**
 * 检测纪律预警
 * 暂留空实现 —— 需要考勤/纪律记录数据支持
 * TODO: 接入考勤系统后实现
 */
export async function detectDisciplineWarnings(_classIds?: string[]): Promise<void> {
  // 纪律预警需要以下数据支持：
  // - 迟到/早退记录
  // - 旷课记录
  // - 违纪处分记录
  // - 课堂纪律评分
  // 当前系统中暂无相关数据模型，待后续 Sprint 接入考勤系统后实现
  console.log("[warning-detector] 纪律预警检测暂未实现，需要考勤数据支持");
}

// ==================== 低参与预警 ====================

/**
 * 检测低参与预警
 * 规则：某维度卓越分为0且表现分 < 3
 * 说明：卓越分代表学生在某维度有突出表现（竞赛、成果等），
 *       表现分代表日常参与情况。两者均低说明该维度几乎无参与。
 */
export async function detectLowEngagementWarnings(classIds?: string[]): Promise<void> {
  const students = await prisma.student.findMany({
    where: classIds && classIds.length > 0 ? { classId: { in: classIds } } : undefined,
    include: {
      class: { include: { grade: true } },
      careerProfile: true,
    },
  });

  for (const student of students) {
    if (!student.careerProfile?.sixDimensions) continue;

    // sixDimensions 存储的是显示分，需要从 breakdown 中解析三层分数
    // 由于 CareerProfile 中只存储了显示分，这里我们基于显示分反推
    // 实际场景中应该在 careerProfile 中存储 breakdown 数据
    // 这里简化处理：显示分接近基准分 + 底线分(36) 说明表现分和卓越分都很低

    const dimensions: SixDimensionJson = JSON.parse(student.careerProfile.sixDimensions);
    const benchmark = getGradeBenchmark(student.class.grade.name);
    const baseLineScore = benchmark + 36; // 底线分36对应的显示分
    const lowEngagementThreshold = benchmark + 39; // 表现分 < 3 对应的显示分（36 + 3 = 39）

    const lowEngagementDimensions: string[] = [];

    for (const dim of SIX_DIMENSIONS) {
      const score = dimensions[dim.key];
      if (score === undefined) continue;

      // 显示分 <= 基准分 + 39，说明表现分 < 3，且卓越分为 0
      if (score <= lowEngagementThreshold) {
        lowEngagementDimensions.push(`${dim.key}(${score.toFixed(1)})`);
      }
    }

    if (lowEngagementDimensions.length === 0) continue;

    // 判断严重程度
    let severity: WarningSeverity = "MEDIUM";
    if (lowEngagementDimensions.length >= 4) {
      severity = "HIGH";
    } else if (lowEngagementDimensions.length === 1) {
      severity = "LOW";
    }

    const exists = await prisma.warning.findFirst({
      where: {
        studentId: student.id,
        type: "LOW_ENGAGEMENT",
        status: { in: ["PENDING", "PROCESSING", "OBSERVING"] },
      },
    });

    if (!exists) {
      await prisma.warning.create({
        data: {
          studentId: student.id,
          type: "LOW_ENGAGEMENT",
          severity,
          description: `以下维度参与度过低（卓越分为0且表现分不足）：${lowEngagementDimensions.join("、")}`,
          triggeredAt: new Date(),
          status: "PENDING",
        },
      });
    }
  }
}

// ==================== 辅助函数 ====================

/**
 * 获取预警类型中文名称
 */
export function getWarningTypeLabel(type: WarningType): string {
  const labels: Record<WarningType, string> = {
    PSYCHOLOGY: "心理预警",
    IMBALANCE: "偏科预警",
    DECAY: "衰减预警",
    DISCIPLINE: "纪律预警",
    LOW_ENGAGEMENT: "低参与预警",
  };
  return labels[type] || type;
}

/**
 * 获取严重程度中文名称
 */
export function getWarningSeverityLabel(severity: WarningSeverity): string {
  const labels: Record<WarningSeverity, string> = {
    HIGH: "高",
    MEDIUM: "中",
    LOW: "低",
    INFO: "提示",
  };
  return labels[severity] || severity;
}

/**
 * 获取严重程度颜色
 */
export function getWarningSeverityColor(severity: WarningSeverity): { bg: string; text: string; border: string } {
  switch (severity) {
    case "HIGH":
      return { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" };
    case "MEDIUM":
      return { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200" };
    case "LOW":
      return { bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-200" };
    case "INFO":
      return { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" };
    default:
      return { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" };
  }
}

/**
 * 获取预警状态中文名称
 */
export function getWarningStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "待处理",
    PROCESSING: "处理中",
    RESOLVED: "已解决",
    OBSERVING: "观察中",
  };
  return labels[status] || status;
}
