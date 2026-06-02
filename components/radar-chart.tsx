"use client";

import { useState, useCallback } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  type RadarChartItem,
  getDimensionColor,
  SIX_DIMENSIONS,
} from "@/lib/dimension-utils";

// ==================== 六维雷达图 ====================

interface SixDimensionRadarProps {
  data: RadarChartItem[];
  height?: number;
  benchmark?: number;
  onDimensionClick?: (dimension: string) => void;
}

/**
 * 六维雷达图（自比模式）
 * - 实线：本学期
 * - 虚线：上学期（如提供）
 * - 不显示班级平均（自比导向）
 */
export function SixDimensionRadar({
  data,
  height = 320,
  benchmark = 170,
  onDimensionClick,
}: SixDimensionRadarProps) {
  const [activeDim, setActiveDim] = useState<string | null>(null);

  // 将显示分归一化到 0-100（成长分的百分比）
  const normalizedData = data.map((item) => ({
    ...item,
    normalized: Math.min(100, Math.max(0, Math.round(((item.current - benchmark) / 60) * 100))),
    normalizedPrev: item.previous
      ? Math.min(100, Math.max(0, Math.round(((item.previous - benchmark) / 60) * 100)))
      : undefined,
  }));

  const handleClick = useCallback(
    (dim: string) => {
      setActiveDim(dim);
      onDimensionClick?.(dim);
    },
    [onDimensionClick]
  );

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart cx="50%" cy="50%" outerRadius="68%" data={normalizedData}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={({ payload, x, y, textAnchor }) => {
              const item = normalizedData.find((d) => d.dimension === payload.value);
              if (!item) return null;
              const isActive = activeDim === payload.value;
              const dimColor = getDimensionColor(payload.value as any);
              return (
                <g>
                  <text
                    x={x}
                    y={y}
                    textAnchor={textAnchor}
                    fill={isActive ? dimColor : "#475569"}
                    fontSize={13}
                    fontWeight={isActive ? 700 : 500}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleClick(payload.value)}
                  >
                    {payload.value}
                  </text>
                </g>
              );
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickCount={5}
          />
          <Tooltip content={<RadarTooltip benchmark={benchmark} />} />

          {/* 上学期（虚线）*/}
          {normalizedData.some((d) => d.normalizedPrev !== undefined) && (
            <Radar
              name="上学期"
              dataKey="normalizedPrev"
              stroke="#94a3b8"
              fill="transparent"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: "#94a3b8", strokeWidth: 0 }}
            />
          )}

          {/* 本学期（实线）*/}
          <Radar
            name="本学期"
            dataKey="normalized"
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.15}
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#fff", stroke: "#2563eb", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* 图例 */}
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-blue-600 rounded-full"></span>
          <span className="text-xs text-slate-500">本学期</span>
        </div>
        {normalizedData.some((d) => d.normalizedPrev !== undefined) && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-slate-400 rounded-full"></span>
            <span className="text-xs text-slate-400">上学期</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== Tooltip ====================

function RadarTooltip({
  active,
  payload,
  label,
  benchmark,
}: {
  active?: boolean;
  payload?: Array<{ payload: any }>;
  label?: string;
  benchmark: number;
}) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload as any;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 min-w-[160px]">
      <p className="text-sm font-bold text-[#1a3a5c] mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">本学期</span>
          <span className="font-medium text-[#1a3a5c]">{data.current}分</span>
        </div>
        {data.previous && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">上学期</span>
            <span className="font-medium text-slate-500">{data.previous}分</span>
          </div>
        )}
        {data.change !== undefined && (
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 mt-1">
            <span className="text-slate-500">变化</span>
            <span
              className={cn(
                "font-medium",
                data.change > 0 ? "text-green-600" : data.change < 0 ? "text-red-600" : "text-slate-400"
              )}
            >
              {data.change > 0 ? "↑" : data.change < 0 ? "↓" : "→"}
              {Math.abs(data.change)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 维度详情卡片 ====================

interface DimensionDetailCardProps {
  dimension: string;
  score: number;
  benchmark: number;
  growth: number;
  breakdown?: { base: number; performance: number; excellence: number };
  label: { label: string; color: string; bgColor: string };
  change?: number;
  isSelected?: boolean;
  onClick?: () => void;
}

/**
 * 单维度详情卡片
 * 展示：显示分、标签、成长分三层拆分、环比变化
 */
export function DimensionDetailCard({
  dimension,
  score,
  benchmark,
  growth,
  breakdown,
  label,
  change,
  isSelected,
  onClick,
}: DimensionDetailCardProps) {
  const dimColor = getDimensionColor(dimension as any);
  const theoryMax = benchmark + 60;
  const progressPercent = Math.min(100, Math.round((score / theoryMax) * 100));

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md",
        isSelected ? "border-blue-300 shadow-md ring-2 ring-blue-100" : "border-slate-100 shadow-sm"
      )}
    >
      {/* 头部：维度名 + 分数 + 标签 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: dimColor }}
          />
          <span className="text-sm font-bold text-[#1a3a5c]">{dimension}</span>
        </div>
        <div className="flex items-center gap-2">
          {change !== undefined && (
            <span
              className={cn(
                "text-xs font-medium",
                change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-slate-400"
              )}
            >
              {change > 0 ? "↑" : change < 0 ? "↓" : "→"}
              {Math.abs(change)}
            </span>
          )}
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ color: label.color, backgroundColor: label.bgColor }}
          >
            {label.label}
          </span>
        </div>
      </div>

      {/* 分数进度条 */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-500">
            {score}/{theoryMax}
          </span>
          <span className="text-[11px] text-slate-400">基准{benchmark}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: dimColor,
            }}
          />
        </div>
      </div>

      {/* 成长分拆分 */}
      {breakdown && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-[10px] text-slate-400 mb-0.5">底线</p>
            <p className="text-xs font-bold text-[#1a3a5c]">{breakdown.base}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-[10px] text-slate-400 mb-0.5">表现</p>
            <p className="text-xs font-bold text-[#1a3a5c]">{breakdown.performance}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-[10px] text-slate-400 mb-0.5">卓越</p>
            <p className="text-xs font-bold text-[#1a3a5c]">{breakdown.excellence}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 均衡度展示 ====================

interface BalanceBadgeProps {
  balance: number;
}

export function BalanceBadge({ balance }: BalanceBadgeProps) {
  let color = "#dc2626";
  let bg = "#fee2e2";
  let text = "严重偏科";

  if (balance >= 90) {
    color = "#16a34a";
    bg = "#dcfce7";
    text = "非常均衡";
  } else if (balance >= 80) {
    color = "#2563eb";
    bg = "#dbeafe";
    text = "基本均衡";
  } else if (balance >= 65) {
    color = "#ca8a04";
    bg = "#fef9c3";
    text = "略有偏科";
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full">
      <span className="text-sm font-bold" style={{ color }}>
        {balance}
      </span>
      <span
        className="text-[11px] px-2 py-0.5 rounded-full font-medium"
        style={{ color, backgroundColor: bg }}
      >
        {text}
      </span>
    </div>
  );
}

// ==================== 成长趋势迷你图 ====================

interface TrendMiniChartProps {
  data: { semester: string; score: number }[];
  color?: string;
  height?: number;
}

/**
 * 单维度成长趋势迷你折线图
 */
export function TrendMiniChart({ data, color = "#2563eb", height = 40 }: TrendMiniChartProps) {
  if (data.length < 2) return null;

  const values = data.map((d) => d.score);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = data.length * 24;
  const points = data
    .map((d, i) => {
      const x = i * 24 + 12;
      const y = height - 4 - ((d.score - min) / range) * (height - 8);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        points={points}
      />
      {data.map((d, i) => {
        const x = i * 24 + 12;
        const y = height - 4 - ((d.score - min) / range) * (height - 8);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={2.5} fill={color} />
            <title>{d.semester}: {d.score}分</title>
          </g>
        );
      })}
    </svg>
  );
}
