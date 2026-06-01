"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, BookOpen, Trophy, Star, Calendar } from "lucide-react";

interface Report {
  id: string;
  semester: string;
  isPublished: boolean;
  createdAt: string;
}

export default function SemesterReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟获取学期档案数据
    // 实际项目中应从 /api/semester-reports 获取
    setTimeout(() => {
      setReports([
        {
          id: "1",
          semester: "2024-2025-1",
          isPublished: true,
          createdAt: new Date().toISOString(),
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">学期档案</h1>
        <p className="text-muted-foreground">查看每个学期的成长总结</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">加载中...</p>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">暂无学期档案</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {report.semester} 学期档案
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        生成于 {new Date(report.createdAt).toLocaleDateString("zh-CN")}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge variant={report.isPublished ? "default" : "secondary"}>
                    {report.isPublished ? "已发布" : "未发布"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <BookOpen className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">6</p>
                    <p className="text-xs text-muted-foreground">参与科目</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Star className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">85.5</p>
                    <p className="text-xs text-muted-foreground">平均分</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Trophy className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">3</p>
                    <p className="text-xs text-muted-foreground">里程碑</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <FileText className="h-5 w-5 text-green-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">2</p>
                    <p className="text-xs text-muted-foreground">教师评语</p>
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
