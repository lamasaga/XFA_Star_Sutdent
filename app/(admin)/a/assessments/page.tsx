"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Brain, Briefcase, UserCircle } from "lucide-react";

interface AssessmentRecord {
  id: string;
  type: string;
  scaleName: string;
  score: number | null;
  riskLevel: string;
  semester: string;
  createdAt: string;
  student: { name: string; studentNo: string };
}

const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  NORMAL: { label: "正常", color: "bg-green-100 text-green-700" },
  WATCH: { label: "关注", color: "bg-yellow-100 text-yellow-700" },
  WARNING: { label: "预警", color: "bg-red-100 text-red-700" },
};

export default function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssessments();
  }, []);

  async function fetchAssessments() {
    try {
      const res = await fetch("/api/admin/assessments?limit=200");
      if (res.ok) {
        const data = await res.json();
        setAssessments(data.assessments || []);
      }
    } catch (error) {
      console.error("获取测评记录失败:", error);
    } finally {
      setLoading(false);
    }
  }

  const psychology = assessments.filter((a) => a.type === "PSYCHOLOGY");
  const career = assessments.filter((a) => a.type === "CAREER");
  const personality = assessments.filter((a) => a.type === "PERSONALITY");

  function renderList(list: AssessmentRecord[]) {
    if (list.length === 0) {
      return <p className="text-muted-foreground py-8 text-center">暂无记录</p>;
    }
    return (
      <div className="space-y-2">
        {list.map((a) => {
          const risk = RISK_CONFIG[a.riskLevel] || RISK_CONFIG.NORMAL;
          return (
            <div key={a.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{a.student.name}</span>
                  <span className="text-xs text-muted-foreground">{a.student.studentNo}</span>
                </div>
                <p className="text-xs text-muted-foreground">{a.scaleName} · {a.semester}</p>
              </div>
              <div className="flex items-center gap-2">
                {a.score !== null && <span className="text-sm font-medium">{a.score}分</span>}
                <Badge variant="outline" className={`text-xs ${risk.color}`}>{risk.label}</Badge>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">测评管理</h1>
        <p className="text-muted-foreground">全校测评记录概览</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            测评记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">加载中...</p>
          ) : (
            <Tabs defaultValue="psychology">
              <TabsList>
                <TabsTrigger value="psychology">
                  <Brain className="h-4 w-4 mr-1" />
                  心理 ({psychology.length})
                </TabsTrigger>
                <TabsTrigger value="career">
                  <Briefcase className="h-4 w-4 mr-1" />
                  职业 ({career.length})
                </TabsTrigger>
                <TabsTrigger value="personality">
                  <UserCircle className="h-4 w-4 mr-1" />
                  性格 ({personality.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="psychology" className="mt-4">
                {renderList(psychology)}
              </TabsContent>
              <TabsContent value="career" className="mt-4">
                {renderList(career)}
              </TabsContent>
              <TabsContent value="personality" className="mt-4">
                {renderList(personality)}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
