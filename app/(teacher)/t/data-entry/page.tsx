"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileSpreadsheet,
  Activity,
  Brain,
  Save,
  CheckCircle2,
  AlertTriangle,
  Bell,
  User,
  TrendingUp,
  TrendingDown,
  Minus,
  Dumbbell,
  HeartPulse,
} from "lucide-react";

// ==================== 类型定义 ====================

interface Student {
  id: string;
  name: string;
  studentNo: string;
}

interface ClassInfo {
  id: string;
  name: string;
}

interface ScoreRow {
  studentId: string;
  name: string;
  studentNo: string;
  score: string;
}

interface FitnessRow {
  studentId: string;
  name: string;
  studentNo: string;
  run50m: string;
  longJump: string;
  sitReach: string;
  run800_1000m: string;
}

interface TeacherInfo {
  name: string;
  role: string;
  teacherRole: string;
}

// ==================== 常量 ====================

const SUBJECTS = ["语文", "数学", "英语", "物理", "化学", "生物"];
const EXAM_TYPES = [
  { value: "MONTHLY", label: "月考" },
  { value: "MIDTERM", label: "期中" },
  { value: "FINAL", label: "期末" },
];

const FITNESS_ITEMS = [
  { key: "run50m", label: "50米跑", gender: "all" },
  { key: "longJump", label: "立定跳远", gender: "all" },
  { key: "sitReach", label: "坐位体前屈", gender: "all" },
  { key: "run800_1000m", label: "800/1000米", gender: "all" },
];

const FITNESS_GRADES = [
  { value: "EXCELLENT", label: "优秀", score: 12 },
  { value: "GOOD", label: "良好", score: 8 },
  { value: "PASS", label: "及格", score: 4 },
  { value: "FAIL", label: "不及格", score: 0 },
];

const PSYCH_TAGS = [
  { value: "情绪稳定", type: "positive" },
  { value: "适应良好", type: "positive" },
  { value: "焦虑倾向", type: "concern" },
  { value: "社交回避", type: "concern" },
  { value: "注意力分散", type: "concern" },
  { value: "情绪低落", type: "warning" },
  { value: "行为异常", type: "warning" },
];

const RISK_LEVELS = [
  { value: "NORMAL", label: "正常", color: "bg-green-100 text-green-700" },
  { value: "LOW", label: "轻度关注", color: "bg-yellow-100 text-yellow-700" },
  { value: "MEDIUM", label: "中度关注", color: "bg-orange-100 text-orange-700" },
  { value: "HIGH", label: "高度关注", color: "bg-red-100 text-red-700" },
];

// ==================== 主组件 ====================

export default function DataEntryPage() {
  const [activeTab, setActiveTab] = useState<"score" | "fitness" | "psych">("score");
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [semester, setSemester] = useState("2024-2025-1");

  // 成绩录入状态
  const [subject, setSubject] = useState("数学");
  const [examType, setExamType] = useState("MONTHLY");
  const [scores, setScores] = useState<ScoreRow[]>([]);

  // 体测状态
  const [fitnessData, setFitnessData] = useState<FitnessRow[]>([]);

  // 心理评价状态
  const [selectedPsychStudent, setSelectedPsychStudent] = useState("");
  const [psychType, setPsychType] = useState("REGULAR");
  const [psychTags, setPsychTags] = useState<string[]>([]);
  const [psychNote, setPsychNote] = useState("");
  const [psychRiskLevel, setPsychRiskLevel] = useState("NORMAL");
  const [notifyHomeroom, setNotifyHomeroom] = useState(false);

  // 通用状态
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // 加载教师信息和班级列表
  useEffect(() => {
    fetchTeacherInfo();
  }, []);

  // 班级变化时加载学生
  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId);
    } else {
      setStudents([]);
    }
  }, [selectedClassId]);

  // 学生列表变化时初始化表格数据
  useEffect(() => {
    if (students.length > 0) {
      setScores(
        students.map((s) => ({
          studentId: s.id,
          name: s.name,
          studentNo: s.studentNo,
          score: "",
        }))
      );
      setFitnessData(
        students.map((s) => ({
          studentId: s.id,
          name: s.name,
          studentNo: s.studentNo,
          run50m: "",
          longJump: "",
          sitReach: "",
          run800_1000m: "",
        }))
      );
    }
  }, [students]);

  async function fetchTeacherInfo() {
    try {
      const res = await fetch("/api/teachers");
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
        // 设置默认选中第一个班级
        if (data.classes?.length > 0 && !selectedClassId) {
          setSelectedClassId(data.classes[0].id);
        }
      }

      // 获取当前教师详细信息
      const meRes = await fetch("/api/teachers/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        setTeacherInfo(meData.teacher);
      }
    } catch (error) {
      console.error("获取教师信息失败:", error);
    }
  }

  async function fetchStudents(classId: string) {
    try {
      const res = await fetch(`/api/students?classId=${classId}&pageSize=200`);
      if (res.ok) {
        const data = await res.json();
        const studentList = data.data || [];
        setStudents(studentList);
      }
    } catch (error) {
      console.error("获取学生列表失败:", error);
    }
  }

  // ==================== 成绩录入 ====================

  function updateScore(index: number, value: string) {
    setScores((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], score: value };
      return next;
    });
  }

  async function saveScores() {
    const validScores = scores
      .filter((s) => s.score !== "" && !isNaN(Number(s.score)))
      .map((s) => ({
        studentId: s.studentId,
        score: Number(s.score),
      }));

    if (validScores.length === 0) {
      setError("请至少录入一条成绩");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scores: validScores,
          subject,
          examType,
          semester,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setScores((prev) => prev.map((s) => ({ ...s, score: "" })));
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存成绩失败:", error);
      setError("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  // ==================== 体测数据 ====================

  function updateFitness(index: number, field: keyof FitnessRow, value: string) {
    setFitnessData((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function calculateFitnessTotal(row: FitnessRow): { total: number; performance: number } {
    const fields: (keyof FitnessRow)[] = ["run50m", "longJump", "sitReach", "run800_1000m"];
    let total = 0;
    let filledCount = 0;

    for (const field of fields) {
      const grade = row[field] as string;
      if (grade) {
        const gradeInfo = FITNESS_GRADES.find((g) => g.value === grade);
        if (gradeInfo) {
          total += gradeInfo.score;
          filledCount++;
        }
      }
    }

    // 表现分 = 总分 / 48 * 12
    const performance = filledCount > 0 ? Math.round((total / 48) * 12 * 10) / 10 : 0;
    return { total, performance };
  }

  async function saveFitnessData() {
    const validData = fitnessData
      .filter((row) => row.run50m || row.longJump || row.sitReach || row.run800_1000m)
      .map((row) => {
        const { total, performance } = calculateFitnessTotal(row);
        return {
          studentId: row.studentId,
          items: [
            { name: "50米跑", grade: row.run50m },
            { name: "立定跳远", grade: row.longJump },
            { name: "坐位体前屈", grade: row.sitReach },
            { name: "800/1000米", grade: row.run800_1000m },
          ].filter((item) => item.grade),
          totalScore: total,
          performanceScore: performance,
        };
      });

    if (validData.length === 0) {
      setError("请至少录入一条体测数据");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/fitness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: validData,
          semester,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setFitnessData((prev) =>
          prev.map((s) => ({
            ...s,
            run50m: "",
            longJump: "",
            sitReach: "",
            run800_1000m: "",
          }))
        );
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存体测数据失败:", error);
      setError("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  // ==================== 心理评价 ====================

  function togglePsychTag(tag: string) {
    setPsychTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function savePsychEvaluation() {
    if (!selectedPsychStudent) {
      setError("请选择学生");
      return;
    }

    if (psychTags.length === 0) {
      setError("请至少选择一个标签");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/psych-evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedPsychStudent,
          type: psychType,
          tags: psychTags,
          note: psychNote,
          riskLevel: psychRiskLevel,
          semester,
          notifyHomeroom,
        }),
      });

      if (res.ok) {
        setSaved(true);
        // 重置表单
        setSelectedPsychStudent("");
        setPsychTags([]);
        setPsychNote("");
        setPsychRiskLevel("NORMAL");
        setNotifyHomeroom(false);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "保存失败");
      }
    } catch (error) {
      console.error("保存心理评价失败:", error);
      setError("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  // ==================== 辅助计算 ====================

  const filledScoreCount = scores.filter((s) => s.score !== "").length;
  const filledFitnessCount = fitnessData.filter(
    (row) => row.run50m || row.longJump || row.sitReach || row.run800_1000m
  ).length;

  // 判断是否为心理老师
  const isPsychTeacher = teacherInfo?.teacherRole === "PSYCHOLOGY" || teacherInfo?.role === "PSYCHOLOGY";

  // ==================== 渲染 ====================

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">数据录入</h1>
        <p className="text-muted-foreground">录入学生各类数据，为六维成长体系提供数据支撑</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "score" ? "default" : "outline"}
          onClick={() => { setActiveTab("score"); setError(""); }}
          className="gap-2"
        >
          <FileSpreadsheet className="w-4 h-4" />
          成绩录入
        </Button>
        <Button
          variant={activeTab === "fitness" ? "default" : "outline"}
          onClick={() => { setActiveTab("fitness"); setError(""); }}
          className="gap-2"
        >
          <Activity className="w-4 h-4" />
          体测数据
        </Button>
        <Button
          variant={activeTab === "psych" ? "default" : "outline"}
          onClick={() => { setActiveTab("psych"); setError(""); }}
          className="gap-2"
        >
          <Brain className="w-4 h-4" />
          心理评价
        </Button>
      </div>

      {/* 班级和学期选择 */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">班级</span>
              <Select value={selectedClassId} onValueChange={(v) => setSelectedClassId(v || "")}>
                <SelectTrigger className="w-[160px]">
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">学期</span>
              <Select value={semester} onValueChange={(v) => setSemester(v || "2024-2025-1")}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-2025-1">2024-2025-1</SelectItem>
                  <SelectItem value="2024-2025-2">2024-2025-2</SelectItem>
                  <SelectItem value="2025-2026-1">2025-2026-1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-[13px]">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* ========== 成绩录入 Tab ========== */}
      {activeTab === "score" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] text-[#1a3a5c]">成绩录入</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px]">
                  已录入 {filledScoreCount}/{scores.length}
                </Badge>
                {saved && (
                  <Badge className="bg-green-100 text-green-700 text-[11px]">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    保存成功
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 考试信息 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-[13px]">科目</Label>
                <Select value={subject} onValueChange={(v) => setSubject(v || "数学")}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[13px]">考试类型</Label>
                <Select value={examType} onValueChange={(v) => setExamType(v || "MONTHLY")}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[13px]">学期</Label>
                <Input value={semester} disabled className="mt-1.5 bg-slate-50" />
              </div>
            </div>

            {/* 成绩表格 */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b">
                    <th className="text-left py-2.5 px-3 text-[12px] text-slate-500 font-medium w-12">#</th>
                    <th className="text-left py-2.5 px-3 text-[12px] text-slate-500 font-medium">姓名</th>
                    <th className="text-left py-2.5 px-3 text-[12px] text-slate-500 font-medium">学号</th>
                    <th className="text-left py-2.5 px-3 text-[12px] text-slate-500 font-medium w-32">成绩</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((row, i) => (
                    <tr key={row.studentId} className="border-b hover:bg-slate-50/50">
                      <td className="py-2 px-3 text-[12px] text-slate-400">{i + 1}</td>
                      <td className="py-2 px-3 text-[13px] font-medium">{row.name}</td>
                      <td className="py-2 px-3 text-[12px] text-slate-500">{row.studentNo}</td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={row.score}
                          onChange={(e) => updateScore(i, e.target.value)}
                          placeholder="0-100"
                          className="h-8 text-[13px]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={saveScores}
                disabled={saving || filledScoreCount === 0}
                className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
              >
                {saving ? (
                  <>
                    <Save className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存成绩 ({filledScoreCount}条)
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========== 体测数据 Tab ========== */}
      {activeTab === "fitness" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
                <Dumbbell className="w-4 h-4" />
                体测数据录入
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[11px]">
                  已录入 {filledFitnessCount}/{fitnessData.length}
                </Badge>
                {saved && (
                  <Badge className="bg-green-100 text-green-700 text-[11px]">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    保存成功
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 评分说明 */}
            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
              <span>评分标准：</span>
              {FITNESS_GRADES.map((g) => (
                <span key={g.value} className="px-2 py-0.5 bg-slate-50 rounded">
                  {g.label} = {g.score}分
                </span>
              ))}
              <span className="text-slate-400">| 满分48分，表现分 = 总分/48 × 12</span>
            </div>

            {/* 体测表格 */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b">
                    <th className="text-left py-2.5 px-3 text-[12px] text-slate-500 font-medium w-12">#</th>
                    <th className="text-left py-2.5 px-3 text-[12px] text-slate-500 font-medium">姓名</th>
                    <th className="text-left py-2.5 px-3 text-[12px] text-slate-500 font-medium">50米跑</th>
                    <th className="text-left py-2.5 px-3 text-[12px] text-slate-500 font-medium">立定跳远</th>
                    <th className="text-left py-2.5 px-3 text-[12px] text-slate-500 font-medium">坐位体前屈</th>
                    <th className="text-left py-2.5 px-3 text-[12px] text-slate-500 font-medium">800/1000米</th>
                    <th className="text-left py-2.5 px-3 text-[12px] text-slate-500 font-medium w-24">总分</th>
                    <th className="text-left py-2.5 px-3 text-[12px] text-slate-500 font-medium w-24">表现分</th>
                  </tr>
                </thead>
                <tbody>
                  {fitnessData.map((row, i) => {
                    const { total, performance } = calculateFitnessTotal(row);
                    return (
                      <tr key={row.studentId} className="border-b hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-[12px] text-slate-400">{i + 1}</td>
                        <td className="py-2 px-3 text-[13px] font-medium">{row.name}</td>
                        {FITNESS_ITEMS.map((item) => (
                          <td key={item.key} className="py-2 px-3">
                            <Select
                              value={row[item.key as keyof FitnessRow] as string}
                              onValueChange={(value) =>
                                updateFitness(i, item.key as keyof FitnessRow, value || "")
                              }
                            >
                              <SelectTrigger className="h-8 text-[12px] w-[100px]">
                                <SelectValue placeholder="-" />
                              </SelectTrigger>
                              <SelectContent>
                                {FITNESS_GRADES.map((g) => (
                                  <SelectItem key={g.value} value={g.value}>
                                    {g.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        ))}
                        <td className="py-2 px-3">
                          <span className="text-[13px] font-medium text-slate-700">
                            {total > 0 ? `${total}/48` : "-"}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className="text-[13px] font-medium text-[#1a3a5c]">
                            {performance > 0 ? performance : "-"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={saveFitnessData}
                disabled={saving || filledFitnessCount === 0}
                className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
              >
                {saving ? (
                  <>
                    <Save className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    保存体测数据 ({filledFitnessCount}人)
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========== 心理评价 Tab ========== */}
      {activeTab === "psych" && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
                <HeartPulse className="w-4 h-4" />
                心理评价录入
                {!isPsychTeacher && (
                  <Badge variant="outline" className="text-[10px] text-slate-400">
                    仅心理老师
                  </Badge>
                )}
              </CardTitle>
              {saved && (
                <Badge className="bg-green-100 text-green-700 text-[11px]">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  保存成功
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {!isPsychTeacher ? (
              <div className="p-8 text-center">
                <Brain className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">心理评价功能仅心理老师可用</p>
                <p className="text-sm text-slate-400 mt-1">
                  如需录入心理评价，请联系心理老师
                </p>
              </div>
            ) : (
              <>
                {/* 学生选择 */}
                <div>
                  <Label className="text-[13px]">选择学生</Label>
                  <Select value={selectedPsychStudent} onValueChange={(v) => setSelectedPsychStudent(v || "")}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="请选择学生" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.studentNo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 评价类型 */}
                <div>
                  <Label className="text-[13px]">评价类型</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Button
                      variant={psychType === "REGULAR" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPsychType("REGULAR")}
                      className="text-[12px]"
                    >
                      定期评估
                    </Button>
                    <Button
                      variant={psychType === "OBSERVATION" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPsychType("OBSERVATION")}
                      className="text-[12px]"
                    >
                      日常观察
                    </Button>
                  </div>
                </div>

                {/* 标签选择 */}
                <div>
                  <Label className="text-[13px]">评价标签</Label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {PSYCH_TAGS.map((tag) => {
                      const isSelected = psychTags.includes(tag.value);
                      const colorClass =
                        tag.type === "positive"
                          ? isSelected
                            ? "bg-green-100 text-green-700 border-green-300"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-green-50"
                          : tag.type === "concern"
                          ? isSelected
                            ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-yellow-50"
                          : isSelected
                          ? "bg-red-100 text-red-700 border-red-300"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-red-50";
                      return (
                        <button
                          key={tag.value}
                          onClick={() => togglePsychTag(tag.value)}
                          className={`px-3 py-1.5 rounded-lg border text-[12px] transition-colors ${colorClass}`}
                        >
                          {isSelected && "✓ "}
                          {tag.value}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 风险等级 */}
                <div>
                  <Label className="text-[13px]">风险等级</Label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {RISK_LEVELS.map((level) => (
                      <button
                        key={level.value}
                        onClick={() => setPsychRiskLevel(level.value)}
                        className={`px-3 py-1.5 rounded-lg border text-[12px] transition-colors ${
                          psychRiskLevel === level.value
                            ? `${level.color} border-current`
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 备注 */}
                <div>
                  <Label className="text-[13px]">备注</Label>
                  <Textarea
                    value={psychNote}
                    onChange={(e) => setPsychNote(e.target.value)}
                    placeholder="请输入观察备注..."
                    className="mt-1.5 min-h-[80px] text-[13px]"
                  />
                </div>

                {/* 通知班主任 */}
                {(psychRiskLevel === "MEDIUM" || psychRiskLevel === "HIGH") && (
                  <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
                    <Checkbox
                      id="notify"
                      checked={notifyHomeroom}
                      onCheckedChange={(checked) => setNotifyHomeroom(checked as boolean)}
                    />
                    <Label htmlFor="notify" className="text-[12px] text-orange-700 cursor-pointer">
                      <Bell className="w-3.5 h-3.5 inline mr-1" />
                      保存并通知班主任（{psychRiskLevel === "HIGH" ? "高风险" : "中风险"}预警）
                    </Label>
                  </div>
                )}

                {/* 保存按钮 */}
                <div className="flex gap-3">
                  <Button
                    onClick={savePsychEvaluation}
                    disabled={saving || !selectedPsychStudent}
                    className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
                  >
                    {saving ? (
                      <>
                        <Save className="w-4 h-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        保存评价
                      </>
                    )}
                  </Button>
                  {notifyHomeroom && (
                    <Button
                      variant="outline"
                      onClick={savePsychEvaluation}
                      disabled={saving || !selectedPsychStudent}
                      className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      <Bell className="w-4 h-4" />
                      保存并通知班主任
                    </Button>
                  )}
                </div>

                {/* 高风险提示 */}
                {psychRiskLevel === "HIGH" && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-[12px]">
                    <AlertTriangle className="w-4 h-4" />
                    高风险评价将自动触发心理预警，请及时跟进处理
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
