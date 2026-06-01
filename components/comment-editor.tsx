"use client";

import { useState } from "react";
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
import { Sparkles, Send, RotateCcw, CheckCircle } from "lucide-react";

interface Student {
  id: string;
  name: string;
  studentNo: string;
  className: string;
  isHomeroom: boolean;
}

const KEYWORD_TAGS = [
  "学习态度端正", "课堂积极参与", "作业完成优秀", "思维活跃",
  "乐于助人", "团队合作好", "领导力强", "创新思维",
  "需要加强时间管理", "需提高专注力", "性格内向", "活泼开朗",
  "组织能力强", "表达能力好", "写作能力突出", "数学思维强",
];

const DIMENSIONS = [
  { key: "学业", label: "学业表现" },
  { key: "态度", label: "学习态度" },
  { key: "协作", label: "团队协作" },
  { key: "创新", label: "创新能力" },
  { key: "责任", label: "责任意识" },
];

export function CommentEditor({ students, preselectedStudentId }: { students: Student[]; preselectedStudentId?: string }) {
  const [selectedStudent, setSelectedStudent] = useState<string>(preselectedStudentId || "");
  const [commentType, setCommentType] = useState<string>("HOMEROOM");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [dimensionScores, setDimensionScores] = useState<Record<string, number>>({});
  const [content, setContent] = useState<string>("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiText, setAiText] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedStudentInfo = students.find((s) => s.id === selectedStudent);

  function toggleKeyword(keyword: string) {
    setSelectedKeywords((prev) =>
      prev.includes(keyword)
        ? prev.filter((k) => k !== keyword)
        : [...prev, keyword]
    );
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
          commentType,
          semester: "2024-2025-1",
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
          semester: "2024-2025-1",
          dimensions: dimensionScores,
        }),
      });

      if (res.ok) {
        setSaved(true);
        setContent("");
        setSelectedKeywords([]);
        setDimensionScores({});
        setAiText("");
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* 学生选择 */}
      <Card>
        <CardHeader>
          <CardTitle>选择学生</CardTitle>
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
        </CardContent>
      </Card>

      {selectedStudentInfo && (
        <>
          {/* 评语类型 */}
          <Card>
            <CardHeader>
              <CardTitle>评语配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>评语类型</Label>
                <Select value={commentType} onValueChange={(v) => setCommentType(v || "HOMEROOM")}>
                  <SelectTrigger className="w-full mt-1">
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

              <div>
                <Label>关键词标签（点击选择）</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {KEYWORD_TAGS.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedKeywords.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/80"
                      onClick={() => toggleKeyword(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                {selectedKeywords.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    已选 {selectedKeywords.length} 个关键词
                  </p>
                )}
              </div>

              <div>
                <Label>评价维度（可选）</Label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {DIMENSIONS.map((d) => (
                    <div key={d.key} className="text-center">
                      <Label className="text-xs">{d.label}</Label>
                      <Select
                        value={dimensionScores[d.key]?.toString() || ""}
                        onValueChange={(v) =>
                          setDimensionScores((prev) => ({ ...prev, [d.key]: parseInt(v || "0") }))
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n}分
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI 辅助生成 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                AI 评语助手
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={generateWithAI}
                disabled={aiGenerating || selectedKeywords.length === 0}
                className="w-full"
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
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{aiText}</p>
                  </div>
                  <Button onClick={acceptAiText} variant="secondary" className="w-full">
                    采用这段评语
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 手动编辑 */}
          <Card>
            <CardHeader>
              <CardTitle>评语内容</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="在此输入评语，或点击上方 AI 生成按钮获取草稿..."
                rows={6}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {content.length} 字
                </p>
                <Button
                  onClick={saveComment}
                  disabled={saving || !content.trim()}
                >
                  {saving ? (
                    <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                  ) : saved ? (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {saved ? "已保存" : saving ? "保存中..." : "提交评语"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
