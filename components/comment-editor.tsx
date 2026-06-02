"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  Send,
  RotateCcw,
  CheckCircle,
  BookOpen,
  Eye,
  Save,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DIMENSION_TAGS_CONFIG,
  canTeacherTagDimension,
  getDimensionMaintainerHint,
} from "@/lib/teacher-permissions";

interface Student {
  id: string;
  name: string;
  studentNo: string;
  className: string;
  isHomeroom: boolean;
}

interface CommentEditorProps {
  students: Student[];
  preselectedStudentId?: string;
  subjects: string[];
}

// ==================== 评语模板 ====================

const COMMENT_TEMPLATES = [
  {
    name: "期末总结",
    template: "{name}同学本学期表现{overall}。在{strongest}方面表现突出，{strongest_detail}。在{weakest}方面还有提升空间，建议{weakest_suggestion}。希望下学期继续保持，全面发展。",
  },
  {
    name: "进步表扬",
    template: "{name}同学本学期进步明显，尤其在{strongest}方面取得了很大进步。{strongest_detail}。老师为你的进步感到高兴，希望你能继续保持。",
  },
  {
    name: "课堂表现",
    template: "{name}同学在课堂上的表现{performance}。{participation}。作业完成情况{homework}。希望继续保持良好的学习习惯。",
  },
  {
    name: "需努力",
    template: "{name}同学本学期在{weakest}方面需要加强。{weakest_detail}。老师相信只要你努力，一定可以取得进步。建议{suggestion}。",
  },
];

// ==================== 快捷关键词 ====================

const KEYWORD_TAGS = [
  "学习态度端正", "课堂积极参与", "作业完成优秀", "思维活跃",
  "乐于助人", "团队合作好", "领导力强", "创新思维",
  "需要加强时间管理", "需提高专注力", "性格内向", "活泼开朗",
  "组织能力强", "表达能力好", "写作能力突出", "数学思维强",
];

const SEMESTER = "2024-2025-1";

function getDraftKey(studentId: string) {
  return `comment_draft_${studentId}_${SEMESTER}`;
}

export function CommentEditor({ students, preselectedStudentId, subjects }: CommentEditorProps) {
  const [selectedStudent, setSelectedStudent] = useState<string>(preselectedStudentId || "");
  const [commentType, setCommentType] = useState<string>("HOMEROOM");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({});
  const [content, setContent] = useState<string>("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiText, setAiText] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [usedTags, setUsedTags] = useState<Record<string, string[]>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const selectedStudentInfo = students.find((s) => s.id === selectedStudent);

  // 计算选中的标签总分值（排除已使用的标签）
  const totalTagPoints = Object.entries(selectedTags).reduce(
    (sum, [dim, tags]) => {
      const used = usedTags[dim] || [];
      const newTags = tags.filter((t) => !used.includes(t));
      return sum + newTags.length * 2;
    },
    0
  );

  // 加载草稿
  useEffect(() => {
    if (!selectedStudent) {
      setContent("");
      setSelectedKeywords([]);
      setSelectedTags({});
      setAiText("");
      setSelectedTemplate("");
      setUsedTags({});
      return;
    }

    const draftKey = getDraftKey(selectedStudent);
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setContent(parsed.content || "");
        setSelectedKeywords(parsed.selectedKeywords || []);
        setSelectedTags(parsed.selectedTags || {});
        setCommentType(parsed.commentType || "HOMEROOM");
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 3000);
      } catch {
        // ignore parse errors
      }
    } else {
      setContent("");
      setSelectedKeywords([]);
      setSelectedTags({});
      setAiText("");
      setSelectedTemplate("");
    }

    // 查询该学生本学期已有标签
    fetchUsedTags(selectedStudent);
  }, [selectedStudent]);

  // 自动保存草稿
  useEffect(() => {
    if (!selectedStudent) return;
    const timer = setTimeout(() => {
      const draft = JSON.stringify({
        content,
        selectedKeywords,
        selectedTags,
        commentType,
      });
      localStorage.setItem(getDraftKey(selectedStudent), draft);
      if (content.trim() || selectedKeywords.length > 0 || Object.keys(selectedTags).length > 0) {
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [content, selectedKeywords, selectedTags, commentType, selectedStudent]);

  async function fetchUsedTags(studentId: string) {
    try {
      const res = await fetch(`/api/comments/check-tags?studentId=${studentId}&semester=${SEMESTER}`);
      if (res.ok) {
        const data = await res.json();
        setUsedTags(data.usedTags || {});
      }
    } catch {
      // ignore errors
    }
  }

  function toggleKeyword(keyword: string) {
    setSelectedKeywords((prev) =>
      prev.includes(keyword)
        ? prev.filter((k) => k !== keyword)
        : [...prev, keyword]
    );
  }

  function toggleDimensionTag(dimension: string, tag: string) {
    // 检查权限
    if (!canTeacherTagDimension(subjects, dimension)) {
      return;
    }
    // 检查是否已使用
    if (usedTags[dimension]?.includes(tag)) {
      return;
    }

    setSelectedTags((prev) => {
      const current = prev[dimension] || [];
      if (current.includes(tag)) {
        return { ...prev, [dimension]: current.filter((t) => t !== tag) };
      }
      return { ...prev, [dimension]: [...current, tag] };
    });
  }

  function applyTemplate(templateName: string) {
    const template = COMMENT_TEMPLATES.find((t) => t.name === templateName);
    if (!template || !selectedStudentInfo) return;

    let text = template.template
      .replace(/{name}/g, selectedStudentInfo.name)
      .replace(/{overall}/g, "良好")
      .replace(/{strongest}/g, "学业")
      .replace(/{strongest_detail}/g, "成绩稳步提升")
      .replace(/{weakest}/g, "社交")
      .replace(/{weakest_suggestion}/g, "多参加集体活动")
      .replace(/{performance}/g, "积极")
      .replace(/{participation}/g, "经常主动发言")
      .replace(/{homework}/g, "优秀")
      .replace(/{suggestion}/g, "制定学习计划并坚持执行");

    setContent(text);
    setSelectedTemplate(templateName);
  }

  async function generateWithAI() {
    if (!selectedStudentInfo || selectedKeywords.length === 0) return;

    setAiGenerating(true);
    setAiText("");
    setContent("");

    try {
      const res = await fetch("/api/ai/comment-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: selectedStudentInfo.name,
          keywords: selectedKeywords,
          dimensionTags: selectedTags,
          commentType,
          semester: SEMESTER,
        }),
      });

      if (!res.ok) {
        throw new Error("AI 生成失败");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("无法读取响应");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              setAiText((prev) => prev + parsed.text);
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (error) {
      setAiText("生成失败，请检查 DeepSeek API 配置。");
    } finally {
      setAiGenerating(false);
    }
  }

  function acceptAiText() {
    setContent(aiText);
    setAiText("");
  }

  function moveToNextStudent() {
    const currentIndex = students.findIndex((s) => s.id === selectedStudent);
    if (currentIndex >= 0 && currentIndex < students.length - 1) {
      setSelectedStudent(students[currentIndex + 1].id);
    } else {
      setAllDone(true);
      setTimeout(() => setAllDone(false), 4000);
    }
  }

  async function saveComment() {
    if (!selectedStudent || !content.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent,
          type: commentType,
          content: content.trim(),
          semester: SEMESTER,
          dimensionTags: selectedTags,
        }),
      });

      if (res.ok) {
        setSaved(true);
        // 清除草稿
        localStorage.removeItem(getDraftKey(selectedStudent));
        // 清空当前内容
        setContent("");
        setSelectedKeywords([]);
        setSelectedTags({});
        setAiText("");
        setSelectedTemplate("");
        setTimeout(() => setSaved(false), 3000);
        // 自动切换下一个学生
        moveToNextStudent();
      }
    } finally {
      setSaving(false);
    }
  }

  // 构建预览内容
  const previewContent = selectedStudentInfo
    ? {
        studentName: selectedStudentInfo.name,
        comment: content.trim() || "（暂无评语内容）",
        tags: selectedTags,
        points: totalTagPoints,
      }
    : null;

  return (
    <TooltipProvider delay={100}>
      <div className="space-y-6">
        {/* 学生选择 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-[15px] text-[#1a3a5c]">选择学生</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedStudent} onValueChange={(v) => setSelectedStudent(v || "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="请选择要评价的学生" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.className} · 学号{s.studentNo}
                    {s.isHomeroom && " (班主任)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {allDone && (
              <p className="text-[13px] text-green-600 mt-2 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                已完成所有学生评语
              </p>
            )}
          </CardContent>
        </Card>

        {selectedStudentInfo && (
          <>
            {/* 评语配置 */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-[15px] text-[#1a3a5c]">评语配置</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* 评语类型 */}
                <div>
                  <Label className="text-[13px] text-[#1a3a5c]">评语类型</Label>
                  <Select value={commentType} onValueChange={(v) => setCommentType(v || "HOMEROOM")}>
                    <SelectTrigger className="w-full mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HOMEROOM">班主任评语</SelectItem>
                      <SelectItem value="SUBJECT">学科评语</SelectItem>
                      <SelectItem value="INSTANT">即时反馈</SelectItem>
                      <SelectItem value="STAGE">阶段性评语</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 模板库 */}
                <div>
                  <Label className="text-[13px] text-[#1a3a5c] flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5" />
                    模板库
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {COMMENT_TEMPLATES.map((t) => (
                      <Badge
                        key={t.name}
                        variant={selectedTemplate === t.name ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer text-[12px] py-1.5 px-3",
                          selectedTemplate === t.name
                            ? "bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
                            : "hover:bg-slate-100"
                        )}
                        onClick={() => applyTemplate(t.name)}
                      >
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* 关键词标签 */}
                <div>
                  <Label className="text-[13px] text-[#1a3a5c]">关键词标签（点击选择）</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {KEYWORD_TAGS.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedKeywords.includes(tag) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer text-[11px] py-1 px-2 transition-colors",
                          selectedKeywords.includes(tag)
                            ? "bg-[#4a90d9] hover:bg-[#4a90d9]/80"
                            : "hover:bg-slate-100"
                        )}
                        onClick={() => toggleKeyword(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {selectedKeywords.length > 0 && (
                    <p className="text-[11px] text-slate-400 mt-2">
                      已选 {selectedKeywords.length} 个关键词
                    </p>
                  )}
                </div>

                {/* 六维标签 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-[13px] text-[#1a3a5c]">六维标签（勾选后自动增加卓越分）</Label>
                    {totalTagPoints > 0 && (
                      <span className="text-[11px] text-green-600 font-medium">
                        +{totalTagPoints}分
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {DIMENSION_TAGS_CONFIG.map((dim) => {
                      const canTag = canTeacherTagDimension(subjects, dim.key);
                      return (
                        <div
                          key={dim.key}
                          className={cn(
                            "rounded-lg border p-3",
                            canTag ? "border-slate-100" : "border-slate-100 bg-slate-50/50"
                          )}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: canTag ? dim.color : "#9ca3af",
                              }}
                            />
                            <span
                              className={cn(
                                "text-[13px] font-medium",
                                canTag ? "text-[#1a3a5c]" : "text-slate-400"
                              )}
                            >
                              {dim.key}
                            </span>
                            {!canTag && (
                              <span className="text-[10px] text-slate-400 ml-auto">
                                无权限
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {dim.tags.map((tag) => {
                              const isSelected = (selectedTags[dim.key] || []).includes(tag);
                              const isUsed = usedTags[dim.key]?.includes(tag);

                              const buttonContent = (
                                <button
                                  key={tag}
                                  onClick={() => toggleDimensionTag(dim.key, tag)}
                                  disabled={!canTag || isUsed}
                                  className={cn(
                                    "text-[11px] px-2 py-1 rounded-full transition-all border",
                                    isUsed
                                      ? "text-slate-300 border-slate-100 bg-slate-50 line-through cursor-not-allowed"
                                      : isSelected
                                        ? "font-medium text-white border-transparent"
                                        : canTag
                                          ? "text-slate-500 border-slate-200 hover:border-slate-300 bg-white"
                                          : "text-slate-300 border-slate-100 bg-slate-50 cursor-not-allowed"
                                  )}
                                  style={
                                    isSelected && !isUsed
                                      ? { backgroundColor: dim.color }
                                      : undefined
                                  }
                                >
                                  {tag}
                                  {isUsed && (
                                    <span className="ml-1 text-[9px]">已使用</span>
                                  )}
                                </button>
                              );

                              if (!canTag) {
                                return (
                                  <Tooltip key={tag}>
                                    <TooltipTrigger>
                                      <span className="inline-block">{buttonContent}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      {getDimensionMaintainerHint(dim.key)}
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              }

                              if (isUsed) {
                                return (
                                  <Tooltip key={tag}>
                                    <TooltipTrigger>
                                      <span className="inline-block">{buttonContent}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      该标签本学期已存在
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              }

                              return buttonContent;
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {totalTagPoints > 0 && (
                    <p className="text-[11px] text-slate-400 mt-2">
                      该评语将为 {selectedStudentInfo.name} 增加 {totalTagPoints} 分卓越分
                      （每个标签 +2 分，每维度每学期封顶 12 分）
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI 辅助生成 */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-[15px] text-[#1a3a5c] flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  AI 评语助手
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={generateWithAI}
                  disabled={aiGenerating || selectedKeywords.length === 0}
                  className="w-full bg-gradient-to-r from-[#1a3a5c] to-[#4a90d9] hover:opacity-90"
                >
                  {aiGenerating ? (
                    <>
                      <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                      正在生成...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      用 AI 生成评语草稿
                    </>
                  )}
                </Button>

                {aiText && (
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-[13px] text-[#1a3a5c] whitespace-pre-wrap leading-relaxed">{aiText}</p>
                    </div>
                    <Button onClick={acceptAiText} variant="secondary" className="w-full">
                      采用这段评语
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 手动编辑 */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-[15px] text-[#1a3a5c]">评语内容</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="在此输入评语，或点击上方 AI 生成按钮获取草稿..."
                  rows={6}
                  className="text-[13px] resize-none"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <p className="text-[11px] text-slate-400">
                      {content.length} 字
                      {content.length > 200 && (
                        <span className="text-amber-500 ml-1 flex items-center gap-1 inline-flex">
                          <AlertTriangle className="w-3 h-3" />
                          建议200字以内
                        </span>
                      )}
                    </p>
                    {draftSaved && (
                      <span className="text-[11px] text-green-600 flex items-center gap-1">
                        <Save className="w-3 h-3" />
                        草稿已保存
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setPreviewOpen(true)}
                      disabled={!content.trim()}
                      variant="outline"
                      className="text-[13px]"
                    >
                      <Eye className="h-4 w-4 mr-1.5" />
                      预览效果
                    </Button>
                    <Button
                      onClick={saveComment}
                      disabled={saving || !content.trim()}
                      className="bg-[#1a3a5c] hover:bg-[#1a3a5c]/90"
                    >
                      {saving ? (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                        </>
                      ) : saved ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                        </>
                      )}
                      {saved ? "已保存" : saving ? "保存中..." : "提交评语"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* 预览 Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                评语预览
              </DialogTitle>
              <DialogDescription>
                模拟学生端看到的效果
              </DialogDescription>
            </DialogHeader>
            {previewContent && (
              <div className="space-y-4 py-2">
                {/* 学生视角卡片 */}
                <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#1a3a5c] flex items-center justify-center text-white text-sm font-medium">
                      {previewContent.studentName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#1a3a5c]">{previewContent.studentName}</p>
                      <p className="text-[11px] text-slate-400">{SEMESTER} 学期评语</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-slate-100 mb-4">
                    <p className="text-[13px] text-[#1a3a5c] leading-relaxed whitespace-pre-wrap">
                      {previewContent.comment}
                    </p>
                  </div>

                  {Object.keys(previewContent.tags).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-400 font-medium">获得标签</p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(previewContent.tags).map(([dim, tags]) =>
                          tags.map((tag) => {
                            const dimConfig = DIMENSION_TAGS_CONFIG.find((d) => d.key === dim);
                            return (
                              <span
                                key={`${dim}-${tag}`}
                                className="text-[11px] px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: dimConfig?.color || "#1a3a5c" }}
                              >
                                {tag}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {previewContent.points > 0 && (
                    <div className="mt-4 flex items-center gap-2 text-[12px] text-green-600 bg-green-50 rounded-lg px-3 py-2">
                      <ChevronRight className="w-4 h-4" />
                      本次评语增加 <strong>{previewContent.points}</strong> 分卓越分
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter showCloseButton>
              <Button onClick={() => setPreviewOpen(false)} variant="outline">
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
