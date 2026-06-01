"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Smile,
  Frown,
  Meh,
  Sun,
  CloudRain,
  Flame,
  Calendar,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const MOOD_ICONS = [
  { value: 1, icon: CloudRain, label: "很低落", color: "text-red-500" },
  { value: 2, icon: Frown, label: "有些低落", color: "text-orange-500" },
  { value: 3, icon: Meh, label: "一般", color: "text-yellow-500" },
  { value: 4, icon: Smile, label: "不错", color: "text-green-500" },
  { value: 5, icon: Sun, label: "非常好", color: "text-blue-500" },
];

interface MoodEntry {
  id: string;
  rating: number;
  note: string | null;
  date: string;
}

export function MoodDiary() {
  const [rating, setRating] = useState<number>(0);
  const [note, setNote] = useState("");
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    try {
      const res = await fetch("/api/mood");
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
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
        const data = await res.json();
        setStreak(data.streak);
        setSaved(true);
        setNote("");
        setRating(0);
        fetchEntries();
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  // 构建趋势图数据（最近14天）
  const trendData = (() => {
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
      const entry = entries.find(
        (e) => new Date(e.date).toDateString() === date.toDateString()
      );
      data.push({
        date: dateStr,
        心情: entry ? entry.rating : null,
      });
    }
    return data;
  })();

  // 计算平均心情
  const avgRating =
    entries.length > 0
      ? (entries.reduce((sum, e) => sum + e.rating, 0) / entries.length).toFixed(1)
      : "-";

  return (
    <div className="space-y-6">
      {/* 今日心情记录 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              今日心情
            </CardTitle>
            {streak > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Flame className="h-3 w-3 text-orange-500" />
                连续 {streak} 天
              </Badge>
            )}
          </div>
          <CardDescription>选择今天的状态，记录此刻的心情</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center gap-4">
            {MOOD_ICONS.map((mood) => {
              const Icon = mood.icon;
              return (
                <button
                  key={mood.value}
                  onClick={() => setRating(mood.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                    rating === mood.value
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <Icon
                    className={`h-8 w-8 ${
                      rating === mood.value ? mood.color : "text-muted-foreground"
                    }`}
                  />
                  <span className="text-xs">{mood.label}</span>
                </button>
              );
            })}
          </div>

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="写下今天的心情...（可选）"
            rows={2}
          />

          <Button
            onClick={saveMood}
            disabled={rating === 0 || saving}
            className="w-full"
          >
            {saved ? "已记录 ✓" : saving ? "保存中..." : "记录心情"}
          </Button>
        </CardContent>
      </Card>

      {/* 心情趋势 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            心情趋势
          </CardTitle>
          <CardDescription>
            近14天心情变化 · 平均心情：{avgRating} 分
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">加载中...</p>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">还没有心情记录，从今天开始吧！</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0.5, 5.5]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="心情"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 最近记录 */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>最近记录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {entries.slice(0, 7).map((entry) => {
              const mood = MOOD_ICONS.find((m) => m.value === entry.rating);
              const Icon = mood?.icon || Meh;
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-2 bg-muted rounded-lg"
                >
                  <Icon className={`h-5 w-5 ${mood?.color || ""}`} />
                  <div className="flex-1">
                    <p className="text-sm">
                      {new Date(entry.date).toLocaleDateString("zh-CN")}
                    </p>
                    {entry.note && (
                      <p className="text-xs text-muted-foreground">{entry.note}</p>
                    )}
                  </div>
                  <Badge variant="outline">{entry.rating} 星</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
