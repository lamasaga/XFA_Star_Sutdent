"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Search, School, FileText, Trophy } from "lucide-react";

interface Student {
  id: string;
  name: string;
  studentNo: string;
  gender: string;
  status: string;
  class: {
    name: string;
    grade: { name: string };
  };
  user: { email: string };
  _count: {
    comments: number;
    milestones: number;
    activities: number;
    scores: number;
  };
}

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    try {
      const res = await fetch("/api/students");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error("获取学生列表失败:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = students.filter(
    (s) =>
      s.name.includes(keyword) ||
      s.studentNo.includes(keyword) ||
      s.class.grade.name.includes(keyword) ||
      s.class.name.includes(keyword)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">我的学生</h1>
          <p className="text-muted-foreground">查看和管理你负责的学生</p>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索学生姓名或学号..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">加载中...</p>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">暂无负责的学生</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              学生列表 ({filteredStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-3 px-2">姓名</th>
                    <th className="text-left py-3 px-2">学号</th>
                    <th className="text-left py-3 px-2">班级</th>
                    <th className="text-left py-3 px-2">状态</th>
                    <th className="text-center py-3 px-2">评语</th>
                    <th className="text-center py-3 px-2">里程碑</th>
                    <th className="text-center py-3 px-2">活动</th>
                    <th className="text-center py-3 px-2">成绩</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2 font-medium">{student.name}</td>
                      <td className="py-3 px-2 text-muted-foreground">{student.studentNo}</td>
                      <td className="py-3 px-2">
                        {student.class.grade.name}{student.class.name}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={student.status === "ENROLLED" ? "default" : "secondary"} className="text-xs">
                          {student.status === "ENROLLED" ? "在读" : student.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          {student._count.comments}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Trophy className="h-3 w-3 text-muted-foreground" />
                          {student._count.milestones}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <School className="h-3 w-3 text-muted-foreground" />
                          {student._count.activities}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          {student._count.scores}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
