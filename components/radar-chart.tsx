"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface RadarData {
  dimension: string;
  score: number;
  average?: number;
  fullMark?: number;
}

interface FiveDimensionRadarProps {
  data: RadarData[];
  showAverage?: boolean;
  height?: number;
}

export function FiveDimensionRadar({
  data,
  showAverage = false,
  height = 300,
}: FiveDimensionRadarProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
        <PolarGrid />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fontSize: 14, fill: "#666" }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 12, fill: "#999" }}
        />
        <Radar
          name="个人得分"
          dataKey="score"
          stroke="#2563eb"
          fill="#2563eb"
          fillOpacity={0.3}
          strokeWidth={2}
        />
        {showAverage && (
          <Radar
            name="班级平均"
            dataKey="average"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.1}
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        )}
        <Legend wrapperStyle={{ fontSize: 14 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
