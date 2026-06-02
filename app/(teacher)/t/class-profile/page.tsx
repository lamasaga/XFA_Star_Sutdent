"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SixDimensionRadar } from "@/components/radar-chart";
import { BarChart3, Users, TrendingUp, Award, BookOpen } from "lucide-react";

interface ClassStat {
  id: string;
  name: string;
  gradeName: string;
  studentCount: number;
  avgScore: number;
  fiveDimensions: Record<string, number>;
}

export default function ClassProfilePage() {
  const [classes, setClasses] = useState<ClassStat[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟获取班级数据
    setTimeout(() => {
      setClasses([
        {
          id: "1",
          name: "1班",
          gradeName: "高一",
          studentCount: 25,
          avgScore: 78.5,
          fiveDimensions: { 学业: 75, 心理: 82, 职业: 65, 社交: 80, 特长: 70 },
        },
        {
          id: "2",
          name: "2班",
          gradeName: "高一",
          studentCount: 24,
          avgScore: 80.2,
          fiveDimensions: { 学业: 78, 心理: 80, 职业: 68, 社交: 78, 特长: 72 },
        },
      ]);
      setLoading(false);
    }, 600);
  }, []);

  const currentClass = classes.find((c) => c.id === selectedClass);

  const radarData = currentClass
    ? [
        { dimension: "学业", score: currentClass.fiveDimensions["学业"] || 0 },
        { dimension: "心理", score: currentClass.fiveDimensions["心理"] || 0 },
        { dimension: "职业", score: currentClass.fiveDimensions["职业"] || 0 },
        { dimension: "社交", score: currentClass.fiveDimensions["社交"] || 0 },
        { dimension: "特长", score: currentClass.fiveDimensions["特长"] || 0 },
      ]
    : [];

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
                  <p className="text-2xl font-bold">{Object.values(currentClass.fiveDimensions).reduce((a, b) => a + b, 0) / 5}</p>
                  <p className="text-sm text-muted-foreground">五维均分</p>
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

          {/* 五维雷达图 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                班级五维雷达
              </CardTitle>
              <CardDescription>
                {currentClass.gradeName}{currentClass.name} 班级平均水平（满分100）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SixDimensionRadar data={radarData.map(d => ({ dimension: d.dimension, current: d.score }))} height={350} />
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
