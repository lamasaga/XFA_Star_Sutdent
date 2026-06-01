"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Brain, Sparkles, Lock, Home, CheckCircle, Clock, Flame,
  Smile, Frown, Meh, Sun, CloudRain, Calendar, TrendingUp,
} from "lucide-react";
import { useSession } from "next-auth/react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ALL_SCALES } from "@/lib/assessment-scales";
import { AssessmentPlayer } from "@/components/assessment-player";

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

interface AssessmentResult {
  id: string;
  type: string;
  scaleName: string;
  score: number | null;
  riskLevel: string | null;
  createdAt: string;
}

const UNLOCKABLES = [
  { name: "基础空间", condition: "入学即得", icon: Home, unlocked: true },
  { name: "成长书架", condition: "完成3次心理测评", icon: Brain, unlocked: false },
  { name: "荣誉墙", condition: "获得首个奖项", icon: Sparkles, unlocked: false },
  { name: "目标树", condition: "设定首个目标", icon: TrendingUp, unlocked: false },
  { name: "时间花园", condition: "记录心情30天", icon: Calendar, unlocked: false },
  { name: "职业罗盘", condition: "完成职业规划测评", icon: Brain, unlocked: false },
];

export default function SpacePage() {
  const { data: session } = useSession();
  const [activeScale, setActiveScale] = useState<string | null>(null);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [assessments, setAssessments] = useState<AssessmentResult[]>([]);
  const [rating, setRating] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [moodRes, assessRes] = await Promise.all([
        fetch("/api/mood"),
        fetch("/api/assessments?pageSize=20"),
      ]);
      if (moodRes.ok) {
        const d = await moodRes.json();
        setMoodEntries(d.entries || []);
      }
      if (assessRes.ok) {
        const d = await assessRes.json();
        setAssessments(d.data || []);
      }
    } catch (error) {
      console.error("获取数据失败:", error);
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
        fetchData();
      }
    } finally {
      setSaving(false);
    }
  }

  // 心情趋势数据
  const trendData = (() => {
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
      const entry = moodEntries.find((e) => new Date(e.date).toDateString() === date.toDateString());
      data.push({ date: dateStr, 心情: entry ? entry.rating : null });
    }
    return data;
  })();

  const avgRating = moodEntries.length > 0
    ? (moodEntries.reduce((sum, e) => sum + e.rating, 0) / moodEntries.length).toFixed(1)
    : "—";

  const completedCount = assessments.length;
  const unlockProgress = Math.min(100, (completedCount / 3) * 100);

  const selectedScale = ALL_SCALES.find((s) => s.id === activeScale);

  if (activeScale && selectedScale) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setActiveScale(null)}>
            ← 返回心灵空间
          </Button>
          <div>
            <h1 className="text-xl font-bold">{selectedScale.name}</h1>
            <p className="text-sm text-muted-foreground">{selectedScale.description}</p>
          </div>
        </div>
        <AssessmentPlayer scale={selectedScale} studentId={session?.user?.studentId || ""} onComplete={() => setActiveScale(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">心灵空间</h1>
        <p className="text-muted-foreground mt-1">心理测评、心情记录与成长空间</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50"><Brain className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-xs text-muted-foreground">已完成测评</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-pink-50"><Calendar className="h-5 w-5 text-pink-600" /></div>
            <div>
              <p className="text-2xl font-bold">{moodEntries.length}</p>
              <p className="text-xs text-muted-foreground">心情记录</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50"><Smile className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">{avgRating}</p>
              <p className="text-xs text-muted-foreground">平均心情</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50"><Sparkles className="h-5 w-5 text-purple-600" /></div>
            <div>
              <p className="text-2xl font-bold">{Math.round(unlockProgress)}%</p>
              <p className="text-xs text-muted-foreground">空间解锁进度</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：心理测评 + 心情 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 心理测评 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-5 w-5" />
                心理测评
              </CardTitle>
              <CardDescription>了解自我，探索心理与职业方向</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ALL_SCALES.map((scale) => {
                  const isCompleted = assessments.some((a) => a.scaleCode === scale.id);
                  return (
                    <div
                      key={scale.id}
                      onClick={() => setActiveScale(scale.id)}
                      className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow relative"
                    >
                      {isCompleted && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <Brain className="h-6 w-6 text-primary" />
                        <Badge variant="outline" className="text-[10px]">
                          {scale.type === "PSYCHOLOGY" ? "心理" : scale.type === "CAREER" ? "职业" : "性格"}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-sm">{scale.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{scale.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>约 {scale.questions.length * 0.5} 分钟</span>
                        <span>· {scale.questions.length} 题</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 测评结果 */}
          {assessments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">测评结果</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assessments.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Brain className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{a.scaleName}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleDateString("zh-CN")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.score !== null && (
                        <span className="text-sm font-bold">{a.score.toFixed(1)}分</span>
                      )}
                      {a.riskLevel && (
                        <Badge variant="outline" className={`text-[10px] ${
                          a.riskLevel === "HIGH" ? "bg-red-100 text-red-700" :
                          a.riskLevel === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {a.riskLevel === "HIGH" ? "需关注" : a.riskLevel === "MEDIUM" ? "一般" : "良好"}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 心情趋势 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                心情趋势
              </CardTitle>
              <CardDescription>近14天心情变化 · 平均心情：{avgRating} 分</CardDescription>
            </CardHeader>
            <CardContent>
              {moodEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">还没有心情记录</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0.5, 5.5]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="心情" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧：心情记录 + 空间解锁 */}
        <div className="space-y-6">
          {/* 今日心情 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                今日心情
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center gap-2">
                {MOOD_ICONS.map((mood) => {
                  const Icon = mood.icon;
                  return (
                    <button
                      key={mood.value}
                      onClick={() => setRating(mood.value)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                        rating === mood.value ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted"
                      }`}
                    >
                      <Icon className={`h-6 w-6 ${rating === mood.value ? mood.color : "text-muted-foreground"}`} />
                      <span className="text-[10px]">{mood.label}</span>
                    </button>
                  );
                })}
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="写下今天的心情..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[60px] resize-y"
              />
              <Button onClick={saveMood} disabled={rating === 0 || saving} className="w-full" size="sm">
                {saving ? "保存中..." : "记录心情"}
              </Button>
            </CardContent>
          </Card>

          {/* 最近心情记录 */}
          {moodEntries.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">最近记录</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {moodEntries.slice(0, 7).map((entry) => {
                  const mood = MOOD_ICONS.find((m) => m.value === entry.rating);
                  const Icon = mood?.icon || Meh;
                  return (
                    <div key={entry.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <Icon className={`h-4 w-4 ${mood?.color || ""}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs">{new Date(entry.date).toLocaleDateString("zh-CN")}</p>
                        {entry.note && <p className="text-[10px] text-muted-foreground truncate">{entry.note}</p>}
                      </div>
                      <Badge variant="outline" className="text-[10px]">{entry.rating} 星</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* 空间解锁 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                成长空间
              </CardTitle>
              <CardDescription>完成任务解锁更多空间</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={unlockProgress} className="h-2" />
              <div className="grid grid-cols-2 gap-2">
                {UNLOCKABLES.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.name}
                      className={`p-3 rounded-lg border text-center ${
                        item.unlocked
                          ? "bg-primary/5 border-primary/20"
                          : "bg-muted/50 border-muted opacity-60"
                      }`}
                    >
                      <Icon className={`h-5 w-5 mx-auto mb-1 ${item.unlocked ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="text-xs font-medium">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.condition}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
