"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Calendar, MapPin, User } from "lucide-react";

interface ActivityRecord {
  id: string;
  name: string;
  category: string;
  type: string;
  role: string;
  result: string | null;
  startDate: string;
  endDate: string | null;
  points: number;
  status: string;
  teacherEvaluation: string | null;
  evaluator: { name: string } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  CLUB: "社团",
  VOLUNTEER: "义工",
  STUDY_TOUR: "研学",
  COMPETITION: "比赛",
  SPORTS: "文体",
  OTHER: "其他",
};

const CATEGORY_COLORS: Record<string, string> = {
  CLUB: "bg-blue-100 text-blue-700",
  VOLUNTEER: "bg-green-100 text-green-700",
  STUDY_TOUR: "bg-purple-100 text-purple-700",
  COMPETITION: "bg-red-100 text-red-700",
  SPORTS: "bg-orange-100 text-orange-700",
  OTHER: "bg-gray-100 text-gray-700",
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  async function fetchActivities() {
    try {
      const res = await fetch("/api/activities");
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error("获取活动记录失败:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-[#1a3a5c]">活动记录</h1>
        <p className="text-sm text-slate-400 mt-0.5">记录你的课内外活动与成长足迹</p>
      </div>

      {loading ? (
        <p className="text-slate-400">加载中...</p>
      ) : activities.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400">还没有活动记录，快去参加学校活动吧！</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {activities.map((a) => (
            <Card key={a.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-medium text-[#1a3a5c]">{a.name}</h3>
                      <Badge variant="outline" className={`text-[11px] ${CATEGORY_COLORS[a.category] || ""}`}>
                        {CATEGORY_LABELS[a.category] || a.category}
                      </Badge>
                      <Badge variant="outline" className="text-[11px]">
                        {a.type === "INTERNAL" ? "校内" : "校外"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        角色：{a.role}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(a.startDate).toLocaleDateString("zh-CN")}
                        {a.endDate && ` ~ ${new Date(a.endDate).toLocaleDateString("zh-CN")}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {a.type === "INTERNAL" ? "校内" : "校外"}
                      </span>
                    </div>
                    {a.result && (
                      <p className="text-sm mt-2 text-green-600">
                        成果：{a.result}
                      </p>
                    )}
                    {a.teacherEvaluation && (
                      <div className="mt-2 p-2 bg-slate-50 rounded text-sm">
                        <p className="text-[11px] text-slate-400 mb-1">
                          教师评价 {a.evaluator ? `· ${a.evaluator.name}` : ""}
                        </p>
                        <p>{a.teacherEvaluation}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <Badge variant="secondary" className="text-sm bg-[#f0d050] text-[#92400e]">
                      +{a.points} 积分
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
