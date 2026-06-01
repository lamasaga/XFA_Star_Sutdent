"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts";
import {
  BookOpen, TrendingUp, Award, Target, RotateCcw, School, ChevronUp, ChevronDown, Minus,
} from "lucide-react";

interface Score {
  id: string;
  subject: string;
  examType: string;
  score: number;
  total: number;
  classRank?: number;
  gradeRank?: number;
  semester: string;
  examDate: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  "语文": "#dc2626",
  "数学": "#2563eb",
  "英语": "#16a34a",
  "物理": "#9333ea",
  "化学": "#ca8a04",
  "生物": "#0891b2",
};

export default function ScoresPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScores();
  }, []);

  async function fetchScores() {
    try {
      const res = await fetch("/api/scores?pageSize=100");
      if (res.ok) {
        const data = await res.json();
        setScores(data.data || []);
      }
    } catch (error) {
      console.error("获取成绩失败:", error);
    } finally {
      setLoading(false);
    }
  }

  // 按科目分组
  const bySubject: Record<string, Score[]> = {};
  scores.forEach((s) => {
    if (!bySubject[s.subject]) bySubject[s.subject] = [];
    bySubject[s.subject].push(s);
  });

  // 每科最新成绩
  const latestBySubject = Object.entries(bySubject).map(([subject, list]) => {
    const sorted = [...list].sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime());
    return { subject, latest: sorted[0], history: sorted };
  });

  // 学科均衡度数据（最新成绩）
  const balanceData = latestBySubject.map(({ subject, latest }) => ({
    subject,
    得分: Math.round((latest.score / latest.total) * 100),
    原始分: latest.score,
  }));

  // 成绩趋势数据
  const trendMap = new Map<string, Record<string, number>>();
  const subjectSet = new Set<string>();
  [...scores].sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()).forEach((s) => {
    const dateKey = new Date(s.examDate).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
    subjectSet.add(s.subject);
    if (!trendMap.has(dateKey)) trendMap.set(dateKey, {});
    trendMap.get(dateKey)![s.subject] = Math.round((s.score / s.total) * 100);
  });
  const trendData = Array.from(trendMap.entries()).map(([date, sc]) => ({ date, ...sc }));
  const subjects = Array.from(subjectSet);

  // 统计
  const avgScore = latestBySubject.length > 0
    ? Math.round(latestBySubject.reduce((sum, s) => sum + (s.latest.score / s.latest.total) * 100, 0) / latestBySubject.length)
    : 0;
  const bestSubject = latestBySubject.length > 0
    ? latestBySubject.reduce((best, s) => (s.latest.score / s.latest.total) > (best.latest.score / best.latest.total) ? s : best)
    : null;
  const weakSubject = latestBySubject.length > 0
    ? latestBySubject.reduce((weak, s) => (s.latest.score / s.latest.total) < (weak.latest.score / weak.latest.total) ? s : bestSubject!)
    : null;

  const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#9333ea", "#ca8a04", "#0891b2"];

  function getRankIcon(current?: number, previous?: number) {
    if (!current || !previous) return <Minus className="h-3 w-3 text-slate-400" />;
    if (current < previous) return <ChevronUp className="h-3 w-3 text-green-500" />;
    if (current > previous) return <ChevronDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-slate-400" />;
  }

  return (
    <div className="space-y-5">
      {/* 标题 */}
      <div>
        <h1 className="text-lg font-bold text-[#1a3a5c]">学业成绩</h1>
        <p className="text-sm text-slate-400 mt-0.5">成绩详情、趋势分析与学科均衡度</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{latestBySubject.length}</p>
                <p className="text-xs text-slate-400">考试科目</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgScore}%</p>
                <p className="text-xs text-slate-400">平均得分率</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{bestSubject?.latest.score || 0}</p>
                <p className="text-xs text-slate-400">最高分 · {bestSubject?.subject || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-50">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scores.length}</p>
                <p className="text-xs text-slate-400">考试记录</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
              <School className="h-4 w-4" />
              学科均衡度
            </CardTitle>
            <CardDescription className="text-[12px]">各科得分率对比，满分100%</CardDescription>
          </CardHeader>
          <CardContent>
            {balanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={balanceData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 13 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Radar name="得分率" dataKey="得分" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">
                暂无成绩数据
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              最新成绩
            </CardTitle>
            <CardDescription className="text-[12px]">各科最新考试得分率</CardDescription>
          </CardHeader>
          <CardContent>
            {balanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={balanceData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: any) => [`${value}%`, "得分率"]} />
                  <Bar dataKey="得分" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">
                暂无成绩数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 成绩趋势 */}
      {trendData.length > 1 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              成绩趋势
            </CardTitle>
            <CardDescription className="text-[12px]">历次考试得分率变化</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any, name: string) => [`${value}%`, name]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {subjects.map((subj, i) => (
                  <Line
                    key={subj}
                    type="monotone"
                    dataKey={subj}
                    stroke={SUBJECT_COLORS[subj] || COLORS[i % COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 3, strokeWidth: 1.5, fill: "#fff" }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 成绩明细 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            成绩明细
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RotateCcw className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : scores.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              暂无成绩记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead>科目</TableHead>
                    <TableHead>考试类型</TableHead>
                    <TableHead>得分</TableHead>
                    <TableHead>得分率</TableHead>
                    <TableHead>班排</TableHead>
                    <TableHead>年排</TableHead>
                    <TableHead>学期</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map((s) => {
                    const rate = Math.round((s.score / s.total) * 100);
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="text-sm">{new Date(s.examDate).toLocaleDateString("zh-CN")}</TableCell>
                        <TableCell className="font-medium">
                          <Badge variant="outline" style={{ borderColor: SUBJECT_COLORS[s.subject] || "#ccc", color: SUBJECT_COLORS[s.subject] || "#666" }}>
                            {s.subject}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-400">
                          {s.examType === "MONTHLY" ? "月考" : s.examType === "MIDTERM" ? "期中" : s.examType === "FINAL" ? "期末" : s.examType}
                        </TableCell>
                        <TableCell className="font-medium">{s.score}/{s.total}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={rate} className="w-16 h-2" />
                            <span className="text-sm">{rate}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{s.classRank ? `第${s.classRank}名` : "—"}</TableCell>
                        <TableCell className="text-sm">{s.gradeRank ? `第${s.gradeRank}名` : "—"}</TableCell>
                        <TableCell className="text-sm text-slate-400">{s.semester}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
