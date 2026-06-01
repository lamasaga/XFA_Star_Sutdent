"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer,
} from "recharts";
import {
  User, School, Calendar, Mail, Award, Trophy, Star, BookOpen, Activity, MessageSquare, Flame, RotateCcw,
  TrendingUp,
} from "lucide-react";

interface ProfileData {
  student: {
    id: string;
    name: string;
    studentNo: string;
    gender: string;
    graduationYear: number;
    enrollmentDate: string;
    status: string;
    class: { name: string; grade: { name: string; level: number } };
    user: { email: string };
    careerProfile?: {
      fiveDimensions: string;
      totalScore: number;
      level: number;
      unlockedItems: string;
    } | null;
  };
}

interface Comment {
  id: string;
  content: string;
  type: string;
  semester: string;
  createdAt: string;
  teacher: { name: string; title: string | null };
}

interface Milestone {
  id: string;
  title: string;
  type: string;
  status: string;
  occurredAt: string;
}

interface ActivityRecord {
  id: string;
  name: string;
  category: string;
  role: string;
  points: number;
  startDate: string;
  result: string | null;
}

const TYPE_ICONS: Record<string, typeof Trophy> = {
  ACADEMIC: BookOpen, ACTIVITY: Activity, COMPETITION: Trophy, PSYCHOLOGY: Star, PERSONAL: User, GROWTH: TrendingUp,
};
const TYPE_COLORS: Record<string, string> = {
  ACADEMIC: "bg-blue-50 text-blue-600", ACTIVITY: "bg-green-50 text-green-600", COMPETITION: "bg-purple-50 text-purple-600",
  PSYCHOLOGY: "bg-pink-50 text-pink-600", PERSONAL: "bg-orange-50 text-orange-600", GROWTH: "bg-yellow-50 text-yellow-600",
};
const TYPE_LABELS: Record<string, string> = {
  ACADEMIC: "学业", ACTIVITY: "活动", COMPETITION: "比赛", PSYCHOLOGY: "心理", PERSONAL: "个人", GROWTH: "成长",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [profileRes, commentsRes, milestonesRes, activitiesRes, scoresRes] = await Promise.all([
          fetch("/api/students/me"),
          fetch("/api/comments?pageSize=6"),
          fetch("/api/milestones?pageSize=6"),
          fetch("/api/activities?pageSize=6"),
          fetch("/api/scores?pageSize=100"),
        ]);

        if (profileRes.ok) setProfile(await profileRes.json());
        if (commentsRes.ok) { const d = await commentsRes.json(); setComments(d.data || []); }
        if (milestonesRes.ok) { const d = await milestonesRes.json(); setMilestones(d.data || []); }
        if (activitiesRes.ok) { const d = await activitiesRes.json(); setActivities(d.activities || []); }
        if (scoresRes.ok) { const d = await scoresRes.json(); setScores(d.data || []); }
      } catch (error) {
        console.error("获取档案失败:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  const student = profile?.student;

  let dimensions: Record<string, number> = {};
  if (student?.careerProfile?.fiveDimensions) {
    try { dimensions = JSON.parse(student.careerProfile.fiveDimensions); } catch { }
  }
  const radarData = ["学业", "心理", "职业", "社交", "特长"].map((d) => ({
    dimension: d, score: dimensions[d] || 50,
  }));

  function getCurrentGrade(graduationYear: number): string {
    const now = new Date();
    const ay = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    const level = graduationYear - ay;
    const map: Record<number, string> = { 3: "高一", 2: "高二", 1: "高三" };
    return map[level] || "—";
  }

  const totalActivities = activities.reduce((s, a) => s + a.points, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RotateCcw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!student) {
    return <div className="text-center py-12 text-muted-foreground">未找到学生信息</div>;
  }

  return (
    <div className="space-y-8">
      {/* 顶部信息区 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">成长档案</h1>
          <p className="text-muted-foreground mt-1">{student.class.grade.name}{student.class.name} · 学号 {student.studentNo}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-3 py-1 text-sm gap-1">
            <Flame className="h-3.5 w-3.5" />
            Lv.{student.careerProfile?.level || 1}
          </Badge>
          <Badge variant="outline" className="px-3 py-1 text-sm gap-1">
            <Award className="h-3.5 w-3.5" />
            {student.careerProfile?.totalScore || 0} 积分
          </Badge>
        </div>
      </div>

      {/* 个人信息 + 五维雷达 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧：个人信息 + 统计 */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1a3a5c] to-[#2d5a87] flex items-center justify-center text-xl font-bold text-white shrink-0">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{student.name}</h2>
                  <p className="text-sm text-muted-foreground">{getCurrentGrade(student.graduationYear)} · {student.graduationYear}级</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{student.user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{student.gender === "FEMALE" ? "女" : "男"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">{new Date(student.enrollmentDate).toLocaleDateString("zh-CN")} 入学</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 统计 */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-[#1a3a5c]">{scores.length}</p>
                <p className="text-xs text-muted-foreground mt-1">考试记录</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-[#1a3a5c]">{comments.length}</p>
                <p className="text-xs text-muted-foreground mt-1">教师评语</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-[#1a3a5c]">{milestones.length}</p>
                <p className="text-xs text-muted-foreground mt-1">里程碑</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-[#1a3a5c]">{totalActivities}</p>
                <p className="text-xs text-muted-foreground mt-1">活动积分</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 右侧：五维雷达 */}
        <Card className="lg:col-span-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">五维成长雷达</CardTitle>
            <CardDescription>个人综合素养评估 · 满分100</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 13, fill: "#475569" }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Radar name="个人" dataKey="score" stroke="#1a3a5c" fill="#1a3a5c" fillOpacity={0.15} strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="space-y-4 flex flex-col justify-center">
                {radarData.map((d) => (
                  <div key={d.dimension}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-[#334155]">{d.dimension}</span>
                      <span className="text-sm font-bold text-[#1a3a5c]">{d.score}</span>
                    </div>
                    <Progress value={d.score} max={100} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {d.score >= 80 ? "表现优秀，继续保持" : d.score >= 60 ? "表现良好，有提升空间" : "需要重点关注和加强"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 评语 */}
      {comments.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">教师评语</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comments.slice(0, 6).map((c) => (
              <Card key={c.id} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <p className="text-sm leading-relaxed text-[#334155]">&ldquo;{c.content}&rdquo;</p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#1a3a5c]/10 flex items-center justify-center text-xs font-medium text-[#1a3a5c]">
                        {c.teacher.name.charAt(0)}
                      </div>
                      <span className="text-xs text-muted-foreground">{c.teacher.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {c.type === "HOMEROOM" ? "班主任" : "学科"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 里程碑 + 活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-4">里程碑</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              {milestones.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">暂无里程碑</div>
              ) : (
                <div className="space-y-1">
                  {milestones.slice(0, 6).map((m) => {
                    const Icon = TYPE_ICONS[m.type] || Trophy;
                    return (
                      <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${TYPE_COLORS[m.type] || "bg-gray-50 text-gray-500"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#334155] truncate">{m.title}</p>
                          <p className="text-xs text-muted-foreground">{new Date(m.occurredAt).toLocaleDateString("zh-CN")}</p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${TYPE_COLORS[m.type] || ""}`}>
                          {TYPE_LABELS[m.type] || m.type}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">活动记录</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">暂无活动记录</div>
              ) : (
                <div className="space-y-1">
                  {activities.slice(0, 6).map((a) => (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#334155] truncate">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.role} · {new Date(a.startDate).toLocaleDateString("zh-CN")}</p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">+{a.points}分</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 成长时间线 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">成长轨迹</h2>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            {(() => {
              const timeline = [
                ...comments.map((c) => ({
                  type: "comment" as const,
                  date: new Date(c.createdAt),
                  title: `${c.teacher.name}老师的评语`,
                  desc: c.content.slice(0, 50) + (c.content.length > 50 ? "..." : ""),
                  badge: c.type === "HOMEROOM" ? "班主任评语" : "学科评语",
                  badgeColor: "bg-blue-50 text-blue-600",
                })),
                ...milestones.map((m) => ({
                  type: "milestone" as const,
                  date: new Date(m.occurredAt),
                  title: m.title,
                  desc: TYPE_LABELS[m.type] || m.type,
                  badge: "里程碑",
                  badgeColor: TYPE_COLORS[m.type] || "bg-gray-50 text-gray-500",
                })),
                ...activities.map((a) => ({
                  type: "activity" as const,
                  date: new Date(a.startDate),
                  title: a.name,
                  desc: `${a.role} · +${a.points}积分`,
                  badge: "活动",
                  badgeColor: "bg-purple-50 text-purple-600",
                })),
                ...scores.slice(0, 6).map((s) => ({
                  type: "score" as const,
                  date: new Date(s.examDate),
                  title: `${s.subject} ${s.examType === "MONTHLY" ? "月考" : s.examType === "MIDTERM" ? "期中" : "期末"} · ${s.score}分`,
                  desc: s.classRank ? `班级排名 第${s.classRank}名` : "",
                  badge: "成绩",
                  badgeColor: "bg-orange-50 text-orange-600",
                })),
              ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 12);

              if (timeline.length === 0) return <div className="text-center py-12 text-muted-foreground">暂无成长记录</div>;

              return (
                <div className="relative">
                  <div className="absolute left-[23px] top-0 bottom-0 w-px bg-border/60" />
                  <div className="space-y-0">
                    {timeline.map((item, i) => (
                      <div key={i} className="flex gap-5 relative py-3">
                        <div className="flex flex-col items-center shrink-0 z-10">
                          <div className="w-12 h-12 rounded-full bg-white border-2 border-border/40 flex items-center justify-center shadow-sm">
                            {item.type === "comment" ? <MessageSquare className="h-4 w-4 text-blue-500" /> :
                             item.type === "milestone" ? <Trophy className="h-4 w-4 text-yellow-500" /> :
                             item.type === "activity" ? <Activity className="h-4 w-4 text-purple-500" /> :
                             <BookOpen className="h-4 w-4 text-orange-500" />}
                          </div>
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-muted-foreground">{item.date.toLocaleDateString("zh-CN")}</span>
                            <Badge variant="outline" className={`text-[10px] ${item.badgeColor}`}>{item.badge}</Badge>
                          </div>
                          <p className="text-sm font-medium text-[#334155]">{item.title}</p>
                          {item.desc && <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
