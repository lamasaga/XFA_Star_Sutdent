"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, School, Users, FileText, Trophy, Activity, Brain } from "lucide-react";

const REPORT_CARDS = [
  { label: "学生分布", desc: "年级、班级、性别分布统计", icon: <School className="h-8 w-8 text-blue-500" />, status: "开发中" },
  { label: "成绩分析", desc: "全校成绩趋势与学科分析", icon: <BarChart3 className="h-8 w-8 text-green-500" />, status: "开发中" },
  { label: "五维雷达", desc: "全校五维能力分布统计", icon: <Activity className="h-8 w-8 text-purple-500" />, status: "开发中" },
  { label: "心理预警", desc: "心理测评预警趋势分析", icon: <Brain className="h-8 w-8 text-red-500" />, status: "开发中" },
  { label: "教师评价", desc: "评语数量与质量统计", icon: <FileText className="h-8 w-8 text-orange-500" />, status: "开发中" },
  { label: "活动参与", desc: "活动参与率与类型分布", icon: <Trophy className="h-8 w-8 text-yellow-500" />, status: "开发中" },
];

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">数据报表</h1>
        <p className="text-muted-foreground">全校数据可视化报表中心</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_CARDS.map((card) => (
          <Card key={card.label} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {card.icon}
                <div className="flex-1">
                  <h3 className="font-medium">{card.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{card.desc}</p>
                  <span className="inline-block mt-2 text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                    {card.status}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
