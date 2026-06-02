/**
 * 六维成长体系工具函数
 * 基于 PRD-六维成长体系v3.1-修订.md
 *
 * 核心公式：
 *   显示分 = 年级基准分 + 成长分
 *   成长分 = 底线分(0~36) + 表现分(0~12) + 卓越分(0~12)
 *   理论满分 = 年级基准分 + 60
 */

// ==================== 六维配置 ====================

export const SIX_DIMENSIONS = [
  { key: "逻辑", color: "#dc2626", lightColor: "#fee2e2", icon: "🧮", description: "数理思维与学科能力" },
  { key: "创新", color: "#0891b2", lightColor: "#cffafe", icon: "💡", description: "科创探索与动手实践" },
  { key: "表达", color: "#9333ea", lightColor: "#f3e8ff", icon: "🗣️", description: "语言表达与沟通能力" },
  { key: "才情", color: "#ca8a04", lightColor: "#fef9c3", icon: "🎨", description: "艺术审美与才艺展示" },
  { key: "身心", color: "#16a34a", lightColor: "#dcfce7", icon: "💪", description: "体育健康与心理状态" },
  { key: "德行", color: "#2563eb", lightColor: "#dbeafe", icon: "🤝", description: "品行道德与责任意识" },
] as const;

export type DimensionKey = (typeof SIX_DIMENSIONS)[number]["key"];

// ==================== 年级基准分 ====================

export const GRADE_BENCHMARKS: Record<string, number> = {
  K1: 40,
  K2: 60,
  K3: 80,
  K4: 100,
  K5: 120,
  K6: 140,
  K7: 155,
  K8: 170,
  K9: 182,
  K10: 192,
  K11: 200,
};

/**
 * 获取年级基准分
 */
export function getGradeBenchmark(gradeName: string): number {
  // 从"高一1班"中提取"高一"，映射到 K9/K10/K11
  const gradeMap: Record<string, string> = {
    高一: "K9",
    高二: "K10",
    高三: "K11",
  };
  const key = gradeMap[gradeName] || gradeName;
  return GRADE_BENCHMARKS[key] || 170;
}

// ==================== 标签体系 ====================

export interface DimensionLabel {
  label: string;
  color: string;
  bgColor: string;
}

/**
 * 根据显示分和理论满分的比例计算标签
 * ratio = 显示分 / 理论满分
 */
export function getDimensionLabel(score: number, benchmark: number): DimensionLabel {
  const theoryMax = benchmark + 60;
  const ratio = score / theoryMax;

  if (ratio >= 1.0)
    return { label: "超前", color: "#9333ea", bgColor: "#f3e8ff" };
  if (ratio >= 0.90)
    return { label: "优秀", color: "#16a34a", bgColor: "#dcfce7" };
  if (ratio >= 0.80)
    return { label: "良好", color: "#2563eb", bgColor: "#dbeafe" };
  if (ratio >= 0.65)
    return { label: "正常", color: "#ca8a04", bgColor: "#fef9c3" };
  return { label: "需支持", color: "#dc2626", bgColor: "#fee2e2" };
}

/**
 * 根据成长分计算标签（用于雷达图内部展示，基于满分100的映射）
 */
export function getGrowthLabel(score: number): DimensionLabel {
  if (score >= 90) return { label: "超前", color: "#9333ea", bgColor: "#f3e8ff" };
  if (score >= 80) return { label: "优秀", color: "#16a34a", bgColor: "#dcfce7" };
  if (score >= 65) return { label: "良好", color: "#2563eb", bgColor: "#dbeafe" };
  if (score >= 50) return { label: "正常", color: "#ca8a04", bgColor: "#fef9c3" };
  return { label: "需支持", color: "#dc2626", bgColor: "#fee2e2" };
}

// ==================== 六维数据结构 ====================

export interface DimensionScores {
  逻辑: number;
  创新: number;
  表达: number;
  才情: number;
  身心: number;
  德行: number;
}

export interface GrowthBreakdown {
  base: number;      // 底线分 0~36
  performance: number; // 表现分 0~12
  excellence: number;  // 卓越分 0~12
}

export interface DimensionDetail {
  score: number;           // 显示分
  benchmark: number;       // 年级基准分
  growth: number;          // 成长分总计
  breakdown: GrowthBreakdown; // 三层拆分
  label: DimensionLabel;   // 标签
  change?: number;         // 环比变化（相对于上学期）
}

export interface SixDimensionData {
  current: Record<DimensionKey, DimensionDetail>;
  previous?: Record<DimensionKey, Pick<DimensionDetail, "score">>;
  semester: string;
  gradeName: string;
}

// ==================== 旧五维到新六维的映射 ====================

const LEGACY_DIMENSION_MAP: Record<string, DimensionKey> = {
  学业: "逻辑",
  心理: "身心",
  职业: "表达",
  社交: "德行",
  特长: "才情",
};

/**
 * 将旧版五维数据映射到新版六维
 * 注意：这是一对多映射，创新维度需要额外数据，此处用估算
 */
export function mapLegacyToSixDimensions(
  legacy: Record<string, number>
): Record<DimensionKey, number> {
  const result: Partial<Record<DimensionKey, number>> = {
    逻辑: 0,
    创新: 0,
    表达: 0,
    才情: 0,
    身心: 0,
    德行: 0,
  };

  for (const [oldKey, value] of Object.entries(legacy)) {
    const newKey = LEGACY_DIMENSION_MAP[oldKey];
    if (newKey) {
      result[newKey] = value;
    }
  }

  // 创新维度从才情估算（如果有特长数据）
  if (legacy["特长"] && legacy["特长"] > 0) {
    result["创新"] = Math.round(legacy["特长"] * 0.85);
    result["才情"] = Math.round(legacy["特长"] * 0.9);
  }

  // 表达维度从职业和学业估算
  if (legacy["职业"] && legacy["职业"] > 0) {
    result["表达"] = Math.max(result["表达"] || 0, legacy["职业"]);
  }

  return result as Record<DimensionKey, number>;
}

// ==================== 均衡度计算 ====================

/**
 * 计算六维均衡度
 * 均衡度 = 100 - 标准差 × 2
 */
export function calculateBalance(scores: Record<string, number>): number {
  const values = Object.values(scores);
  if (values.length === 0) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return Math.max(0, Math.min(100, Math.round(100 - stdDev * 2)));
}

/**
 * 判断偏科程度
 */
export function getBalanceStatus(balance: number): {
  status: string;
  color: string;
  description: string;
} {
  if (balance >= 90) return { status: "非常均衡", color: "#16a34a", description: "六维发展协调，无明显短板" };
  if (balance >= 80) return { status: "基本均衡", color: "#2563eb", description: "整体发展良好，个别维度可加强" };
  if (balance >= 65) return { status: "略有偏科", color: "#ca8a04", description: "存在明显短板，建议关注最低维度" };
  return { status: "严重偏科", color: "#dc2626", description: "多维度明显滞后，需要重点干预" };
}

// ==================== 演示数据生成 ====================

/**
 * 生成演示用的六维完整数据
 */
export function generateDemoDimensionData(gradeName: string): SixDimensionData {
  const benchmark = getGradeBenchmark(gradeName);

  const currentScores: Record<DimensionKey, DimensionDetail> = {
    逻辑: {
      score: benchmark + 48,
      benchmark,
      growth: 48,
      breakdown: { base: 36, performance: 10, excellence: 2 },
      label: getDimensionLabel(benchmark + 48, benchmark),
      change: 5,
    },
    创新: {
      score: benchmark + 42,
      benchmark,
      growth: 42,
      breakdown: { base: 36, performance: 6, excellence: 0 },
      label: getDimensionLabel(benchmark + 42, benchmark),
      change: -3,
    },
    表达: {
      score: benchmark + 50,
      benchmark,
      growth: 50,
      breakdown: { base: 36, performance: 12, excellence: 2 },
      label: getDimensionLabel(benchmark + 50, benchmark),
      change: 7,
    },
    才情: {
      score: benchmark + 38,
      benchmark,
      growth: 38,
      breakdown: { base: 36, performance: 2, excellence: 0 },
      label: getDimensionLabel(benchmark + 38, benchmark),
      change: -2,
    },
    身心: {
      score: benchmark + 46,
      benchmark,
      growth: 46,
      breakdown: { base: 36, performance: 8, excellence: 2 },
      label: getDimensionLabel(benchmark + 46, benchmark),
      change: 3,
    },
    德行: {
      score: benchmark + 52,
      benchmark,
      growth: 52,
      breakdown: { base: 36, performance: 12, excellence: 4 },
      label: getDimensionLabel(benchmark + 52, benchmark),
      change: 2,
    },
  };

  const previousScores: Record<DimensionKey, Pick<DimensionDetail, "score">> = {
    逻辑: { score: benchmark + 43 },
    创新: { score: benchmark + 45 },
    表达: { score: benchmark + 43 },
    才情: { score: benchmark + 40 },
    身心: { score: benchmark + 43 },
    德行: { score: benchmark + 50 },
  };

  return {
    current: currentScores,
    previous: previousScores,
    semester: "2025-2026-1",
    gradeName,
  };
}

// ==================== 雷达图数据转换 ====================

export interface RadarChartItem {
  dimension: string;
  current: number;
  previous?: number;
  label?: string;
  labelColor?: string;
  change?: number;
}

/**
 * 将 SixDimensionData 转换为雷达图所需格式
 */
export function toRadarChartData(data: SixDimensionData): RadarChartItem[] {
  return SIX_DIMENSIONS.map((dim) => {
    const detail = data.current[dim.key];
    const prev = data.previous?.[dim.key];
    return {
      dimension: dim.key,
      current: detail.score,
      previous: prev?.score,
      label: detail.label.label,
      labelColor: detail.label.color,
      change: detail.change,
    };
  });
}

/**
 * 将显示分归一化到 0-100（用于雷达图半径映射）
 * 归一化分 = (显示分 - 基准分) / 60 * 100
 */
export function normalizeScore(score: number, benchmark: number): number {
  return Math.min(100, Math.max(0, Math.round(((score - benchmark) / 60) * 100)));
}

/**
 * 获取维度颜色配置
 */
export function getDimensionColor(key: DimensionKey): string {
  return SIX_DIMENSIONS.find((d) => d.key === key)?.color || "#666";
}

export function getDimensionLightColor(key: DimensionKey): string {
  return SIX_DIMENSIONS.find((d) => d.key === key)?.lightColor || "#f1f5f9";
}

export function getDimensionIcon(key: DimensionKey): string {
  return SIX_DIMENSIONS.find((d) => d.key === key)?.icon || "●";
}

export function getDimensionDescription(key: DimensionKey): string {
  return SIX_DIMENSIONS.find((d) => d.key === key)?.description || "";
}
