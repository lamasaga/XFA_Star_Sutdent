"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Award,
  Calendar,
  Smile,
  AlertTriangle,
  ChevronRight,
  BarChart3,
  Printer,
  Download,
} from "lucide-react";

// ==================== 类型定义 ====================

interface ClassInfo {
  id: string;
  name: string;
}

interface StudentInfo {
  id: string;
  name: string;
  studentNo: string;
  className?: string;
}

interface DimensionData {
  name: string;
  score: number;
  change: number;
  label: string;
}

interface CommentItem {
  id: string;
  content: string;
  teacherName: string;
  createdAt: string;
}

interface MilestoneItem {
  id: string;
  title: string;
  type: string;
  occurredAt: string;
}

interface ActivityItem {
  id: string;
  name: string;
  category: string;
  role: string;
}

interface MoodStats {
  recordCount: number;
  avgRating: number;
}

interface StudentReport {
  studentId: string;
  studentName: string;
  dimensions: DimensionData[];
  comments: CommentItem[];
  milestones: MilestoneItem[];
  activities: ActivityItem[];
  moodStats: MoodStats;
  generatedAt: string;
  semester: string;
}

interface WeeklyClassData {
  dimensionChanges: { name: string; avgChange: number }[];
  newMilestones: number;
  moodTrend: { up: number; stable: number; down: number };
  warnings: { count: number; newCount: number };
  highlightStudents: { name: string; reason: string }[];
}

// ==================== 常量 ====================

const DIMENSION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  逻辑: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
  创新: { bg: "bg-cyan-50", text: "text-cyan-600", border: "border-cyan-200" },
  表达: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" },
  才情: { bg: "bg-yellow-50", text: "text-yellow-600", border: "border-yellow-200" },
  身心: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
  德行: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
};

const SIX_DIMENSIONS = ["逻辑", "创新", "表达", "才情", "身心", "德行"];

// ==================== 主组件 ====================

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"parent" | "weekly">("parent");
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<StudentReport[]>([]);
  const [editingReport, setEditingReport] = useState<StudentReport | null>(null);
  const [editContent, setEditContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMap, setSentMap] = useState<Record<string, boolean>>({});
  const [weeklyData, setWeeklyData] = useState<WeeklyClassData | null>(null);
  const [loadingWeekly, setLoadingWeekly] = useState(false);

  // 加载教师班级列表
  useEffect(() => {
    fetchClasses();
  }, []);

  // 班级变化时加载学生
  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId);
    } else {
      setStudents([]);
      setSelectedStudentIds([]);
    }
  }, [selectedClassId]);

  async function fetchClasses() {
    try {
      const res = await fetch("/api/teachers");
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error("获取班级列表失败:", error);
    }
  }

  async function fetchStudents(classId: string) {
    try {
      const res = await fetch(`/api/students?classId=${classId}&pageSize=200`);
      if (res.ok) {
        const data = await res.json();
        const list = data.data || [];
        setStudents(
          list.map((s: { id: string; name: string; studentNo: string }) => ({
            id: s.id,
            name: s.name,
            studentNo: s.studentNo,
          }))
        );
      }
    } catch (error) {
      console.error("获取学生列表失败:", error);
    }
  }

  function toggleStudent(studentId: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  }

  function selectAllStudents() {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  }

  // 生成单个学生报告
  async function generateSingleReport(studentId: string) {
    const res = await fetch("/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, semester: "2024-2025-1" }),
    });
    if (res.ok) {
      return await res.json();
    }
    return null;
  }

  // 生成报告（单条或批量）
  async function handleGenerate() {
    if (selectedStudentIds.length === 0) {
      alert("请至少选择一名学生");
      return;
    }

    setGenerating(true);
    const reports: StudentReport[] = [];

    for (const studentId of selectedStudentIds) {
      const report = await generateSingleReport(studentId);
      if (report) {
        reports.push(report);
      }
    }

    setGeneratedReports(reports);
    setGenerating(false);
  }

  // 发送给家长
  async function handleSendToParent(report: StudentReport) {
    setSending(true);
    // 模拟发送，实际应调用消息API
    await new Promise((r) => setTimeout(r, 800));
    setSentMap((prev) => ({ ...prev, [report.studentId]: true }));
    setSending(false);
  }

  // 打开编辑对话框
  function openEdit(report: StudentReport) {
    setEditingReport(report);
    setEditContent(formatReportText(report));
  }

  // 格式化报告为文本
  function formatReportText(report: StudentReport): string {
    const lines = [
      `【${report.studentName}家长沟通报告】`,
      `生成时间：${new Date(report.generatedAt).toLocaleString()}`,
      `学期：${report.semester}`,
      "",
      "【六维发展概览】",
      ...report.dimensions.map(
        (d) =>
          `  ${d.name}：${d.score}分 ${d.change > 0 ? "↑" : d.change < 0 ? "↓" : "→"}${Math.abs(d.change)}`
      ),
      "",
      "【教师评语精选】",
      ...report.comments.map((c) => `  ${c.teacherName}：${c.content}`),
      "",
      "【本学期里程碑】",
      ...report.milestones.map((m) => `  · ${m.title}`),
      "",
      "【活动参与】",
      ...report.activities.map((a) => `  · ${a.name}（${a.role}）`),
      "",
      "【心情记录统计】",
      `  记录次数：${report.moodStats.recordCount}次`,
      `  平均评分：${report.moodStats.avgRating.toFixed(1)}/5.0`,
    ];
    return lines.join("\n");
  }

  // 加载班级周报数据
  async function loadWeeklyReport() {
    if (!selectedClassId) {
      alert("请先选择班级");
      return;
    }
    setLoadingWeekly(true);
    try {
      const res = await fetch("/api/reports/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: selectedClassId, semester: "2024-2025-1" }),
      });
      if (res.ok) {
        const data = await res.json();
        setWeeklyData(data.weeklyData || null);
      }
    } catch (error) {
      console.error("加载周报失败:", error);
    } finally {
      setLoadingWeekly(false);
    }
  }

  // ==================== 渲染 ====================

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">报告生成</h1>
        <p className="text-muted-foreground">生成家长沟通报告和班级周报</p>
      </div>

      {/* 顶部选择区 */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">班级</span>
              <Select value={selectedClassId} onValueChange={(v) => setSelectedClassId(v || "")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="选择班级" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClassId && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">
                  已选 {selectedStudentIds.length}/{students.length} 人
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllStudents}
                  className="text-[12px] h-7"
                >
                  {selectedStudentIds.length === students.length ? "取消全选" : "全选"}
                </Button>
              </div>
            )}
          </div>

          {/* 学生多选列表 */}
          {selectedClassId && students.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 max-h-[120px] overflow-y-auto">
              {students.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] cursor-pointer border transition-colors ${
                    selectedStudentIds.includes(s.id)
                      ? "bg-[#f0f9ff] border-[#1a3a5c]/20 text-[#1a3a5c]"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Checkbox
                    checked={selectedStudentIds.includes(s.id)}
                    onCheckedChange={() => toggleStudent(s.id)}
                    className="w-3.5 h-3.5"
                  />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 功能Tab */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "parent" ? "default" : "outline"}
          onClick={() => setActiveTab("parent")}
          className="gap-2"
        >
          <Users className="w-4 h-4" />
          家长沟通报告
        </Button>
        <Button
          variant={activeTab === "weekly" ? "default" : "outline"}
          onClick={() => setActiveTab("weekly")}
          className="gap-2"
        >
          <FileText className="w-4 h-4" />
          班级周报
        </Button>
      </div>

      {/* ========== 家长沟通报告 ========== */}
      {activeTab === "parent" && (
        <div className="space-y-4">
          {/* 生成按钮 */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleGenerate}
              disabled={generating || selectedStudentIds.length === 0}
              className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90 gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中 ({generatedReports.length}/{selectedStudentIds.length})
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  {selectedStudentIds.length > 1
                    ? `批量生成 (${selectedStudentIds.length}人)`
                    : "生成报告"}
                </>
              )}
            </Button>
            {generatedReports.length > 0 && (
              <Badge variant="outline" className="text-[11px]">
                已生成 {generatedReports.length} 份报告
              </Badge>
            )}
          </div>

          {/* 报告列表 */}
          {generatedReports.length > 0 && (
            <div className="space-y-4">
              {generatedReports.map((report) => (
                <Card key={report.studentId} className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white text-sm font-medium">
                          {report.studentName.charAt(0)}
                        </div>
                        <div>
                          <CardTitle className="text-[15px]">{report.studentName}</CardTitle>
                          <p className="text-[11px] text-slate-400">
                            {report.semester} · {new Date(report.generatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-[12px] h-8"
                              onClick={() => openEdit(report)}
                            >
                              <Printer className="w-3.5 h-3.5" />
                              预览/编辑
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="text-[16px]">
                                {report.studentName} - 家长沟通报告
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-2">
                              {/* 六维概览 */}
                              <div>
                                <h4 className="text-[13px] font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                                  <BarChart3 className="w-4 h-4 text-slate-400" />
                                  六维发展概览
                                </h4>
                                <div className="grid grid-cols-3 gap-2">
                                  {report.dimensions.map((dim) => {
                                    const colors = DIMENSION_COLORS[dim.name] || {
                                      bg: "bg-slate-50",
                                      text: "text-slate-600",
                                      border: "border-slate-200",
                                    };
                                    return (
                                      <div
                                        key={dim.name}
                                        className={`p-2.5 rounded-lg border ${colors.bg} ${colors.border}`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className={`text-[12px] font-medium ${colors.text}`}>
                                            {dim.name}
                                          </span>
                                          {dim.change > 0 ? (
                                            <TrendingUp className="w-3 h-3 text-green-500" />
                                          ) : dim.change < 0 ? (
                                            <TrendingDown className="w-3 h-3 text-red-500" />
                                          ) : (
                                            <Minus className="w-3 h-3 text-slate-400" />
                                          )}
                                        </div>
                                        <div className="mt-1 flex items-baseline gap-1">
                                          <span className={`text-[16px] font-bold ${colors.text}`}>
                                            {dim.score}
                                          </span>
                                          <span
                                            className={`text-[11px] ${
                                              dim.change > 0
                                                ? "text-green-600"
                                                : dim.change < 0
                                                ? "text-red-600"
                                                : "text-slate-400"
                                            }`}
                                          >
                                            {dim.change > 0 ? "+" : ""}
                                            {dim.change}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <Separator />

                              {/* 评语精选 */}
                              <div>
                                <h4 className="text-[13px] font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                                  <Star className="w-4 h-4 text-slate-400" />
                                  教师评语精选（最近3条）
                                </h4>
                                <div className="space-y-2">
                                  {report.comments.map((c) => (
                                    <div
                                      key={c.id}
                                      className="p-3 bg-slate-50 rounded-lg text-[12px] text-slate-600"
                                    >
                                      <p>{c.content}</p>
                                      <p className="text-[11px] text-slate-400 mt-1">
                                        — {c.teacherName} ·{" "}
                                        {new Date(c.createdAt).toLocaleDateString()}
                                      </p>
                                    </div>
                                  ))}
                                  {report.comments.length === 0 && (
                                    <p className="text-[12px] text-slate-400">暂无评语</p>
                                  )}
                                </div>
                              </div>

                              <Separator />

                              {/* 里程碑 */}
                              <div>
                                <h4 className="text-[13px] font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                                  <Award className="w-4 h-4 text-slate-400" />
                                  本学期里程碑
                                </h4>
                                <div className="space-y-1.5">
                                  {report.milestones.map((m) => (
                                    <div
                                      key={m.id}
                                      className="flex items-center gap-2 text-[12px] text-slate-600"
                                    >
                                      <ChevronRight className="w-3 h-3 text-slate-400" />
                                      {m.title}
                                    </div>
                                  ))}
                                  {report.milestones.length === 0 && (
                                    <p className="text-[12px] text-slate-400">暂无里程碑</p>
                                  )}
                                </div>
                              </div>

                              <Separator />

                              {/* 活动记录 */}
                              <div>
                                <h4 className="text-[13px] font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4 text-slate-400" />
                                  活动参与
                                </h4>
                                <div className="space-y-1.5">
                                  {report.activities.map((a) => (
                                    <div
                                      key={a.id}
                                      className="flex items-center gap-2 text-[12px] text-slate-600"
                                    >
                                      <ChevronRight className="w-3 h-3 text-slate-400" />
                                      {a.name}（{a.role}）
                                    </div>
                                  ))}
                                  {report.activities.length === 0 && (
                                    <p className="text-[12px] text-slate-400">暂无活动记录</p>
                                  )}
                                </div>
                              </div>

                              <Separator />

                              {/* 心情统计 */}
                              <div>
                                <h4 className="text-[13px] font-medium text-slate-700 mb-2 flex items-center gap-1.5">
                                  <Smile className="w-4 h-4 text-slate-400" />
                                  心情记录统计
                                </h4>
                                <div className="flex gap-4 text-[12px]">
                                  <div className="px-3 py-2 bg-slate-50 rounded-lg">
                                    <span className="text-slate-400">记录次数</span>
                                    <span className="ml-2 font-medium text-slate-700">
                                      {report.moodStats.recordCount}次
                                    </span>
                                  </div>
                                  <div className="px-3 py-2 bg-slate-50 rounded-lg">
                                    <span className="text-slate-400">平均评分</span>
                                    <span className="ml-2 font-medium text-slate-700">
                                      {report.moodStats.avgRating.toFixed(1)}/5.0
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-2">
                                  * 仅展示统计信息，不显示具体心情内容，保护学生隐私
                                </p>
                              </div>

                              <Separator />

                              {/* 可编辑区域 */}
                              <div>
                                <h4 className="text-[13px] font-medium text-slate-700 mb-2">
                                  报告内容（可编辑）
                                </h4>
                                <Textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="min-h-[200px] text-[12px] leading-relaxed"
                                />
                              </div>

                              {/* 操作按钮 */}
                              <div className="flex gap-2 pt-2">
                                <Button
                                  onClick={() => handleSendToParent(report)}
                                  disabled={sending || sentMap[report.studentId]}
                                  className="gap-2 bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
                                >
                                  {sentMap[report.studentId] ? (
                                    <>
                                      <CheckCircle2 className="w-4 h-4" />
                                      已发送
                                    </>
                                  ) : sending ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      发送中...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="w-4 h-4" />
                                      发送给家长
                                    </>
                                  )}
                                </Button>
                                <Button variant="outline" className="gap-2">
                                  <Download className="w-4 h-4" />
                                  导出PDF
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-[12px] h-8 text-green-600"
                          disabled={sentMap[report.studentId]}
                          onClick={() => handleSendToParent(report)}
                        >
                          {sentMap[report.studentId] ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              已发送
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              发送
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {/* 六维快速预览 */}
                    <div className="flex flex-wrap gap-2">
                      {report.dimensions.map((dim) => {
                        const colors = DIMENSION_COLORS[dim.name] || {
                          bg: "bg-slate-50",
                          text: "text-slate-600",
                        };
                        return (
                          <div
                            key={dim.name}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] ${colors.bg} ${colors.text}`}
                          >
                            <span>{dim.name}</span>
                            <span className="font-medium">{dim.score}</span>
                            <span
                              className={
                                dim.change > 0
                                  ? "text-green-600"
                                  : dim.change < 0
                                  ? "text-red-600"
                                  : "text-slate-400"
                              }
                            >
                              {dim.change > 0 ? "+" : ""}
                              {dim.change}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {/* 其他摘要 */}
                    <div className="flex gap-3 mt-2 text-[11px] text-slate-400">
                      <span>评语 {report.comments.length}条</span>
                      <span>里程碑 {report.milestones.length}个</span>
                      <span>活动 {report.activities.length}项</span>
                      <span>心情记录 {report.moodStats.recordCount}次</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* 空状态 */}
          {generatedReports.length === 0 && !generating && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">选择学生后点击"生成报告"</p>
                <p className="text-sm text-slate-400 mt-1">
                  支持单条生成或批量生成全班报告
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ========== 班级周报 ========== */}
      {activeTab === "weekly" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={loadWeeklyReport}
              disabled={loadingWeekly || !selectedClassId}
              className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90 gap-2"
            >
              {loadingWeekly ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  加载中...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4" />
                  生成本周周报
                </>
              )}
            </Button>
            {!selectedClassId && (
              <span className="text-[12px] text-slate-400">请先选择班级</span>
            )}
          </div>

          {weeklyData && (
            <div className="space-y-4">
              {/* 六维变化 */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    六维变化趋势
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {weeklyData.dimensionChanges.map((dim) => {
                      const colors = DIMENSION_COLORS[dim.name] || {
                        bg: "bg-slate-50",
                        text: "text-slate-600",
                        border: "border-slate-200",
                      };
                      return (
                        <div
                          key={dim.name}
                          className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[12px] font-medium ${colors.text}`}>
                              {dim.name}
                            </span>
                            {dim.avgChange > 0 ? (
                              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                            ) : dim.avgChange < 0 ? (
                              <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                            ) : (
                              <Minus className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </div>
                          <div className="mt-1">
                            <span
                              className={`text-[18px] font-bold ${
                                dim.avgChange > 0
                                  ? "text-green-600"
                                  : dim.avgChange < 0
                                  ? "text-red-600"
                                  : "text-slate-500"
                              }`}
                            >
                              {dim.avgChange > 0 ? "+" : ""}
                              {dim.avgChange.toFixed(1)}
                            </span>
                            <span className="text-[11px] text-slate-400 ml-1">班级均值</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* 新增里程碑 & 心情趋势 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      本周里程碑
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-4">
                      <span className="text-[32px] font-bold text-[#1a3a5c]">
                        {weeklyData.newMilestones}
                      </span>
                      <p className="text-[12px] text-slate-400 mt-1">新增里程碑</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
                      <Smile className="w-4 h-4" />
                      心情趋势
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-around py-2">
                      <div className="text-center">
                        <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
                        <span className="text-[16px] font-bold text-green-600">
                          {weeklyData.moodTrend.up}
                        </span>
                        <p className="text-[11px] text-slate-400">上升</p>
                      </div>
                      <div className="text-center">
                        <Minus className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                        <span className="text-[16px] font-bold text-slate-500">
                          {weeklyData.moodTrend.stable}
                        </span>
                        <p className="text-[11px] text-slate-400">平稳</p>
                      </div>
                      <div className="text-center">
                        <TrendingDown className="w-5 h-5 text-red-500 mx-auto mb-1" />
                        <span className="text-[16px] font-bold text-red-600">
                          {weeklyData.moodTrend.down}
                        </span>
                        <p className="text-[11px] text-slate-400">下降</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 预警动态 */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    预警动态
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-[24px] font-bold text-orange-500">
                        {weeklyData.warnings.count}
                      </span>
                      <p className="text-[12px] text-slate-400">当前预警总数</p>
                    </div>
                    <div className="w-px h-10 bg-slate-100" />
                    <div>
                      <span className="text-[24px] font-bold text-red-500">
                        {weeklyData.warnings.newCount}
                      </span>
                      <p className="text-[12px] text-slate-400">本周新增</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 亮点学生 */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    亮点学生
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {weeklyData.highlightStudents.map((student, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg"
                      >
                        <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 text-[12px] font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <span className="text-[13px] font-medium text-slate-700">
                            {student.name}
                          </span>
                          <p className="text-[11px] text-slate-400">{student.reason}</p>
                        </div>
                      </div>
                    ))}
                    {weeklyData.highlightStudents.length === 0 && (
                      <p className="text-[12px] text-slate-400 text-center py-4">
                        本周暂无亮点学生数据
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 周报空状态 */}
          {!weeklyData && !loadingWeekly && (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">选择班级后点击"生成本周周报"</p>
                <p className="text-sm text-slate-400 mt-1">
                  周报将自动汇总本周班级数据摘要
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
