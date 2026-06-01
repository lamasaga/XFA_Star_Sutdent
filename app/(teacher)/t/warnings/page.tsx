"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Brain, CheckCircle, Eye } from "lucide-react";

interface AssessmentWarning {
  id: string;
  scaleName: string;
  score: number | null;
  riskLevel: string;
  createdAt: string;
  student: {
    id: string;
    name: string;
    studentNo: string;
    class: {
      name: string;
      grade: { name: string };
    };
  };
}

export default function WarningsPage() {
  const [warnings, setWarnings] = useState<AssessmentWarning[]>([]);
  const [watches, setWatches] = useState<AssessmentWarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWarnings();
  }, []);

  async function fetchWarnings() {
    try {
      const res = await fetch("/api/warnings");
      if (res.ok) {
        const data = await res.json();
        setWarnings(data.warnings || []);
        setWatches(data.watches || []);
      }
    } catch (error) {
      console.error("获取预警列表失败:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">心理预警</h1>
        <p className="text-muted-foreground">关注需要心理支持的学生</p>
      </div>

      {/* 预警统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-600">{warnings.length}</p>
              <p className="text-sm text-red-600/80">预警学生</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="flex items-center gap-4 pt-6">
            <Eye className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-yellow-600">{watches.length}</p>
              <p className="text-sm text-yellow-600/80">需关注学生</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="flex items-center gap-4 pt-6">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-600">正常</p>
              <p className="text-sm text-green-600/80">系统运行中</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 预警列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            预警学生列表
          </CardTitle>
          <CardDescription>
            基于心理测评数据的风险识别，请及时关注和介入
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">加载中...</p>
          ) : warnings.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600 py-4">
              <CheckCircle className="h-5 w-5" />
              <p>暂无预警学生</p>
            </div>
          ) : (
            <div className="space-y-3">
              {warnings.map((w) => (
                <div
                  key={w.id}
                  className="flex items-start justify-between p-4 bg-red-50 border border-red-100 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{w.student.name}</p>
                        <Badge variant="destructive" className="text-xs">
                          预警
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {w.student.class.grade.name}{w.student.class.name} · 学号{w.student.studentNo}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Brain className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{w.scaleName}</span>
                        {w.score !== null && (
                          <span className="text-sm text-muted-foreground">
                            得分：{w.score}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(w.createdAt).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 需关注列表 */}
      {watches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-yellow-500" />
              需关注学生
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {watches.map((w) => (
                <div
                  key={w.id}
                  className="flex items-start justify-between p-4 bg-yellow-50 border border-yellow-100 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <Eye className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{w.student.name}</p>
                        <Badge variant="secondary" className="text-xs">
                          关注
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {w.student.class.grade.name}{w.student.class.name} · 学号{w.student.studentNo}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Brain className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{w.scaleName}</span>
                        {w.score !== null && (
                          <span className="text-sm text-muted-foreground">
                            得分：{w.score}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
