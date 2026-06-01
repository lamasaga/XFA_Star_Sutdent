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
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-[#1a3a5c]">学期档案</h1>
        <p className="text-sm text-slate-400 mt-0.5">查看每个学期的成长总结</p>
      </div>

      {loading ? (
        <p className="text-slate-400">加载中...</p>
      ) : reports.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-400">暂无学期档案</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card key={report.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-[15px] text-[#1a3a5c]">
                      <FileText className="h-5 w-5" />
                      {report.semester} 学期档案
                    </CardTitle>
                    <CardDescription className="mt-1 text-[12px]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        生成于 {new Date(report.createdAt).toLocaleDateString("zh-CN")}
                      </span>
                    </CardDescription>
                  </div>
                  <Badge variant={report.isPublished ? "default" : "secondary"} className="bg-[#4a90d9] text-white">
                    {report.isPublished ? "已发布" : "未发布"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <BookOpen className="h-5 w-5 text-[#4a90d9] mx-auto mb-1" />
                    <p className="text-lg font-bold">6</p>
                    <p className="text-[11px] text-slate-400">参与科目</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <Star className="h-5 w-5 text-[#f0d050] mx-auto mb-1" />
                    <p className="text-lg font-bold">85.5</p>
                    <p className="text-[11px] text-slate-400">平均分</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <Trophy className="h-5 w-5 text-purple-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">3</p>
                    <p className="text-[11px] text-slate-400">里程碑</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-lg">
                    <FileText className="h-5 w-5 text-green-500 mx-auto mb-1" />
                    <p className="text-lg font-bold">2</p>
                    <p className="text-[11px] text-slate-400">教师评语</p>
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
