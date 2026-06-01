"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Flame, TrendingUp, Calendar, Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const MOOD_OPTIONS = [
  { value: 1, label: "很低落", emoji: "😢", color: "bg-red-50 text-red-600 border-red-200" },
  { value: 2, label: "有些低落", emoji: "😕", color: "bg-orange-50 text-orange-600 border-orange-200" },
  { value: 3, label: "一般", emoji: "😐", color: "bg-slate-50 text-slate-600 border-slate-200" },
  { value: 4, label: "不错", emoji: "🙂", color: "bg-blue-50 text-blue-600 border-blue-200" },
  { value: 5, label: "非常好", emoji: "😄", color: "bg-green-50 text-green-600 border-green-200" },
];

interface MoodEntry {
  id: string;
  rating: number;
  note: string | null;
  date: string;
}

export default function MoodPage() {
  const { data: session } = useSession();
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMoodData();
  }, []);

  async function fetchMoodData() {
    try {
      const res = await fetch("/api/mood");
      if (res.ok) {
        const data = await res.json();
        setMoodEntries(data.entries || []);
      }
    } catch (error) {
      console.error("获取心情数据失败:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveMood() {
    if (rating === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, note: note.trim() || undefined }),
      });
      if (res.ok) {
        setRating(0);
        setNote("");
        fetchMoodData();
      }
    } finally {
      setSaving(false);
    }
  }

  // 心情趋势数据（近30天）
  const trendData = (() => {
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
      const entry = moodEntries.find(
        (e) => new Date(e.date).toDateString() === date.toDateString()
      );
      data.push({ date: dateStr, 心情: entry ? entry.rating : null });
    }
    return data;
  })();

  // 日历热力图数据
  const calendarData = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: Array<{ date: Date; rating: number | null; day: number }> = [];
    // 显示最近30天
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const entry = moodEntries.find(
        (e) => new Date(e.date).toDateString() === date.toDateString()
      );
      days.push({ date, rating: entry ? entry.rating : null, day: date.getDate() });
    }
    return days;
  })();

  // 统计计算
  const monthlyRatings = moodEntries
    .filter((e) => {
      const d = new Date(e.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .map((e) => e.rating);

  const monthlyAverage =
    monthlyRatings.length > 0
      ? (monthlyRatings.reduce((a, b) => a + b, 0) / monthlyRatings.length).toFixed(1)
      : "—";

  const highest = monthlyRatings.length > 0 ? Math.max(...monthlyRatings) : "—";
  const lowest = monthlyRatings.length > 0 ? Math.min(...monthlyRatings) : "—";
  const positiveDays = monthlyRatings.filter((r) => r >= 4).length;
  const lowDays = monthlyRatings.filter((r) => r <= 2).length;

  // 连续记录天数
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const entryDates = new Set(moodEntries.map((e) => new Date(e.date).toDateString()));
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    if (entryDates.has(checkDate.toDateString())) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse space-y-4 w-full max-w-md">
          <div className="h-8 bg-gray-100 rounded w-1/3" />
          <div className="h-40 bg-gray-100 rounded" />
          <div className="h-60 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div>
        <h1 className="text-lg font-bold text-[#1a3a5c]">心情日记</h1>
        <p className="text-sm text-slate-400 mt-0.5">记录心情，关注心理健康</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 左侧：记录 + 日历 + 趋势 */}
        <div className="lg:col-span-2 space-y-5">
          {/* 今日心情 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                今日心情
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {MOOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRating(opt.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                      rating === opt.value
                        ? opt.color + " ring-2 ring-offset-1"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-[11px]">{opt.label}</span>
                  </button>
                ))}
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="写下今天的心情..."
                className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4a90d9]/20 min-h-[80px] resize-y"
              />
              <Button
                onClick={saveMood}
                disabled={rating === 0 || saving}
                className="bg-[#4a90d9] hover:bg-[#357abd]"
              >
                {saving ? "保存中..." : "记录心情"}
              </Button>
            </CardContent>
          </Card>

          {/* 心情日历热力图 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                心情日历
              </CardTitle>
              <CardDescription className="text-xs">近30天记录情况，颜色越深心情越好</CardDescription>
            </CardHeader>
            <CardContent>
              <div data-testid="mood-calendar" className="grid grid-cols-7 gap-1">
                {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
                  <div key={d} className="text-center text-[10px] text-slate-400 py-1">
                    {d}
                  </div>
                ))}
                {(() => {
                  // 补齐空白格子，让第一天对齐正确的星期
                  const firstDay = calendarData[0]?.date?.getDay() || 0;
                  const blanks = Array.from({ length: firstDay }, (_, i) => (
                    <div key={`blank-${i}`} className="aspect-square" />
                  ));
                  return blanks;
                })()}
                {calendarData.map((day, i) => {
                  const intensity = day.rating
                    ? day.rating === 1
                      ? "bg-red-200"
                      : day.rating === 2
                      ? "bg-orange-200"
                      : day.rating === 3
                      ? "bg-slate-200"
                      : day.rating === 4
                      ? "bg-blue-300"
                      : "bg-green-400"
                    : "bg-slate-50 border border-slate-100";
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded-md flex items-center justify-center text-[10px] ${intensity} ${
                        day.rating ? "text-slate-700 font-medium" : "text-slate-300"
                      }`}
                      title={
                        day.rating
                          ? `${day.date.toLocaleDateString("zh-CN")}: ${MOOD_OPTIONS.find((m) => m.value === day.rating)?.label}`
                          : `${day.date.toLocaleDateString("zh-CN")}: 未记录`
                      }
                    >
                      {day.day}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 近30天心情趋势 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                近30天心情趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              {moodEntries.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  还没有心情记录，开始记录吧
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240} data-testid="mood-trend-chart">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <YAxis domain={[0.5, 5.5]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="心情"
                      stroke="#4a90d9"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#4a90d9" }}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：统计 + 最近记录 */}
        <div className="space-y-5">
          {/* 心情统计 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] text-[#1a3a5c]">心情统计</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "本月平均", value: monthlyAverage },
                { label: "最高", value: highest },
                { label: "最低", value: lowest },
                { label: "积极天数", value: positiveDays },
                { label: "低落天数", value: lowDays },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between py-1">
                  <span className="text-[13px] text-slate-500">{stat.label}</span>
                  <span className="text-[13px] font-bold text-[#1a3a5c]">{stat.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-slate-500">连续记录</span>
                  <span className="text-[13px] font-bold text-orange-500 flex items-center gap-1">
                    <Flame className="w-4 h-4" />
                    {streak} 天
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 最近记录 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] text-[#1a3a5c]">最近记录</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {moodEntries.length === 0 ? (
                <p className="text-sm text-slate-400">暂无记录</p>
              ) : (
                moodEntries.slice(0, 10).map((entry) => {
                  const opt = MOOD_OPTIONS.find((m) => m.value === entry.rating);
                  return (
                    <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                      <span className="text-lg">{opt?.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-[#1a3a5c]">
                          {new Date(entry.date).toLocaleDateString("zh-CN")} · {opt?.label}
                        </p>
                        {entry.note && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{entry.note}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {entry.rating} 星
                      </Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
