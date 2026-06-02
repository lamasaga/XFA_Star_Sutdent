"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SixDimensionRadar } from "@/components/radar-chart";
import {
  AlertTriangle,
  CheckCircle2,
  Users,
  TrendingUp,
  Heart,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import {
  SIX_DIMENSIONS,
  getDimensionLabel,
} from "@/lib/dimension-utils";

interface DashboardData {
  teacher: { name: string; role: string };
  classStats: {
    studentCount: number;
    className: string;
    avgDimensions: Record<string, number>;
    benchmark: number;
    moodAvg: number;
  } | null;
  warnings: Array<{
    id: string;
    studentId: string;
    studentName: string;
    type: string;
    severity: string;
    description: string;
  }>;
  todos: Array<{
    id: string;
    text: string;
    priority: string;
    action: string;
  }>;
}

export default function TeacherDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      const res = await fetch("/api/teachers/me/dashboard");
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error("获取Dashboard数据失败:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="h-80 bg-gray-100 rounded-xl" />
          </div>
          <div className="space-y-5">
            <div className="h-40 bg-gray-100 rounded-xl" />
            <div className="h-48 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.classStats) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">暂无班级数据</p>
      </div>
    );
  }

  const { classStats, warnings, todos } = data;

  // 构建雷达图数据
  const radarData = SIX_DIMENSIONS.map((dim) => {
    const score = classStats.avgDimensions[dim.key] || classStats.benchmark + 36;
    return {
      dimension: dim.key,
      current: score,
      label: getDimensionLabel(score, classStats.benchmark).label,
      labelColor: getDimensionLabel(score, classStats.benchmark).color,
    };
  });

  // 统计卡片数据
  const statCards = [
    {
      label: "班级人数",
      value: classStats.studentCount,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "心情均值",
      value: classStats.moodAvg || "--",
      icon: Heart,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "预警学生",
      value: warnings.length,
      icon: AlertTriangle,
      color: warnings.length > 0 ? "text-amber-600" : "text-green-600",
      bg: warnings.length > 0 ? "bg-amber-50" : "bg-green-50",
    },
    {
      label: "待办事项",
      value: todos.length,
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 欢迎区 */}
      <div>
        <h1 className="text-xl font-bold text-[#1a3a5c]">
          {classStats.className} 班级看板
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          查看班级整体发展态势和需要关注的学生
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#1a3a5c]">{stat.value}</p>
                    <p className="text-xs text-slate-400">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：雷达图 */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[15px] text-[#1a3a5c]">班级六维雷达</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    {classStats.className} 班级平均水平
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SixDimensionRadar
                  data={radarData}
                  benchmark={classStats.benchmark}
                  height={280}
                />
                <div className="space-y-2">
                  {SIX_DIMENSIONS.map((dim) => {
                    const score = classStats.avgDimensions[dim.key] || classStats.benchmark + 36;
                    const label = getDimensionLabel(score, classStats.benchmark);
                    const pct = Math.min(100, Math.round(((score - classStats.benchmark) / 60) * 100));
                    return (
                      <div key={dim.key} className="flex items-center gap-3">
                        <span className="text-lg">{dim.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[13px] font-medium text-[#1a3a5c]">{dim.key}</span>
                            <span
                              className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{ color: label.color, backgroundColor: label.bgColor }}
                            >
                              {label.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, backgroundColor: dim.color }}
                              />
                            </div>
                            <span className="text-[11px] text-slate-500 w-10 text-right">{score}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：预警 + 待办 */}
        <div className="space-y-5">
          {/* 需关注学生 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  需关注学生
                </CardTitle>
                {warnings.length > 0 && (
                  <Badge className="bg-amber-100 text-amber-700">{warnings.length}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {warnings.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-600 py-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>班级状态良好，暂无预警</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {warnings.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          w.severity === "HIGH"
                            ? "bg-red-500"
                            : w.severity === "MEDIUM"
                            ? "bg-amber-500"
                            : "bg-yellow-400"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#1a3a5c]">{w.studentName}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{w.description}</p>
                      </div>
                      <Link href={`/t/students`}>
                        <Button size="sm" variant="ghost" className="h-7 text-[11px] text-[#4a90d9]">
                          查看
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 本周待办 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] text-[#1a3a5c]">本周待办</CardTitle>
            </CardHeader>
            <CardContent>
              {todos.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-green-600 py-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>本周任务全部完成！</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {todos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          todo.priority === "high"
                            ? "bg-red-400"
                            : todo.priority === "medium"
                            ? "bg-amber-400"
                            : "bg-slate-300"
                        }`}
                      />
                      <span className="flex-1 text-[13px] text-[#1a3a5c]">{todo.text}</span>
                      <Link href={todo.action}>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
