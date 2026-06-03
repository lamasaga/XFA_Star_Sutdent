"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SixDimensionRadar } from "@/components/radar-chart";
import { BarChart3, Users, TrendingUp, Award, BookOpen } from "lucide-react";
import { SIX_DIMENSIONS, getDimensionLabel } from "@/lib/dimension-utils";

interface ClassStat {
  id: string;
  name: string;
  gradeName: string;
  studentCount: number;
  avgScore: number;
  sixDimensions: Record<string, number>;
}

export default function ClassProfilePage() {
  const [classes, setClasses] = useState<ClassStat[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: 从API获取真实班级数据
    setTimeout(() => {
      setClasses([
        {
          id: "1",
          name: "1班",
          gradeName: "高一",
          studentCount: 25,
          avgScore: 78.5,
          sixDimensions: { 逻辑: 75, 创新: 65, 表达: 80, 才情: 70, 身心: 82, 德行: 78 },
        },
        {
          id: "2",
          name: "2班",
          gradeName: "高一",
          studentCount: 24,
          avgScore: 80.2,
          sixDimensions: { 逻辑: 78, 创新: 68, 表达: 78, 才情: 72, 身心: 80, 德行: 76 },
        },
      ]);
      setLoading(false);
    }, 600);
  }, []);

  const currentClass = classes.find((c) => c.id === selectedClass);

  const radarData = currentClass
    ? SIX_DIMENSIONS.map((dim) => ({
        dimension: dim.key,
        current: currentClass.sixDimensions[dim.key] || 0,
      }))
    : [];

  const benchmark = 170; // 高一基准分

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">班级画像</h1>
        <p className="text-muted-foreground">查看班级整体发展态势</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            选择班级
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v || "")}>
            <SelectTrigger className="w-full md:w-80">
              <SelectValue placeholder="选择要查看的班级" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.gradeName}{c.name} ({c.studentCount}人)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {currentClass ? (
        <div className="space-y-6">
          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{currentClass.studentCount}</p>
                  <p className="text-sm text-muted-foreground">学生人数</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <BookOpen className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{currentClass.avgScore}</p>
                  <p className="text-sm text-muted-foreground">平均分</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <TrendingUp className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {Object.values(currentClass.sixDimensions).reduce((a, b) => a + b, 0) / 6}
                  </p>
                  <p className="text-sm text-muted-foreground">六维均分</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <Award className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">Top3</p>
                  <p className="text-sm text-muted-foreground">最强维度</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 六维雷达图 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                班级六维雷达
              </CardTitle>
              <CardDescription>
                {currentClass.gradeName}{currentClass.name} 班级平均水平（满分100）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SixDimensionRadar
                  data={radarData.map((d) => ({ dimension: d.dimension, current: d.current }))}
                  benchmark={benchmark}
                  height={350}
                />
                <div className="space-y-2">
                  {SIX_DIMENSIONS.map((dim) => {
                    const score = currentClass.sixDimensions[dim.key] || 0;
                    const label = getDimensionLabel(score, benchmark);
                    const pct = Math.min(100, Math.round(((score - benchmark) / 60) * 100));
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
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {loading ? "加载中..." : "请选择一个班级查看详细画像"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
