"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AssessmentScale } from "@/lib/assessment-scales";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Brain,
} from "lucide-react";

interface AssessmentPlayerProps {
  scale: AssessmentScale;
  studentId: string;
  onComplete?: () => void;
}

export function AssessmentPlayer({ scale, studentId, onComplete }: AssessmentPlayerProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    range: { label: string; description: string; riskLevel: string };
  } | null>(null);

  const totalQuestions = scale.questions.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  function selectAnswer(value: number) {
    const qId = scale.questions[currentQuestion].id;
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }

  function goNext() {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  }

  function goPrev() {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  }

  function canProceed() {
    const qId = scale.questions[currentQuestion].id;
    return answers[qId] !== undefined;
  }

  function isComplete() {
    return scale.questions.every((q) => answers[q.id] !== undefined);
  }

  async function submitAssessment() {
    if (!isComplete()) return;

    setSubmitting(true);

    // 计算总分
    const totalScore = Object.values(answers).reduce((sum, v) => sum + v, 0);

    // 查找结果区间
    const range =
      scale.resultRanges.find(
        (r) => totalScore >= r.min && totalScore <= r.max
      ) || scale.resultRanges[scale.resultRanges.length - 1];

    // 保存到数据库
    try {
      await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scaleId: scale.id,
          scaleCode: scale.code,
          scaleName: scale.name,
          type: scale.type,
          score: totalScore,
          riskLevel: range.riskLevel,
          answers,
          semester: "2024-2025-1",
        }),
      });
    } catch (error) {
      console.error("保存测评结果失败:", error);
    }

    setResult({
      score: totalScore,
      range: {
        label: range.label,
        description: range.description,
        riskLevel: range.riskLevel,
      },
    });
    setSubmitted(true);
    setSubmitting(false);
  }

  function restart() {
    setCurrentQuestion(0);
    setAnswers({});
    setSubmitted(false);
    setResult(null);
  }

  if (submitted && result) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            测评完成
          </CardTitle>
          <CardDescription>{scale.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-4xl font-bold">{result.score}</p>
            <p className="text-sm text-muted-foreground mt-1">总得分</p>
          </div>

          <div
            className={`p-4 rounded-lg ${
              result.range.riskLevel === "NORMAL"
                ? "bg-green-50 border border-green-200"
                : result.range.riskLevel === "WATCH"
                ? "bg-yellow-50 border border-yellow-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {result.range.riskLevel === "WARNING" ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : (
                <Brain className="h-5 w-5" />
              )}
              <h3 className="font-bold">{result.range.label}</h3>
            </div>
            <p className="text-sm">{result.range.description}</p>
            <Badge
              variant={
                result.range.riskLevel === "NORMAL"
                  ? "default"
                  : result.range.riskLevel === "WATCH"
                  ? "secondary"
                  : "destructive"
              }
              className="mt-2"
            >
              {result.range.riskLevel === "NORMAL"
                ? "正常"
                : result.range.riskLevel === "WATCH"
                ? "关注"
                : "预警"}
            </Badge>
          </div>

          <div className="flex gap-3">
            <Button onClick={restart} variant="outline" className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              重新测评
            </Button>
            <Button onClick={onComplete} className="flex-1">
              返回列表
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const question = scale.questions[currentQuestion];
  const currentAnswer = answers[question.id];

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline">
            {currentQuestion + 1} / {totalQuestions}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {Math.round(progress)}% 完成
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <CardTitle className="text-lg mt-4">{question.text}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {question.options.map((option) => (
            <button
              key={option.value}
              onClick={() => selectAnswer(option.value)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                currentAnswer === option.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-muted border-border"
              }`}
            >
              <span className="font-medium">{option.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={currentQuestion === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            上一题
          </Button>

          {currentQuestion < totalQuestions - 1 ? (
            <Button onClick={goNext} disabled={!canProceed()}>
              下一题
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={submitAssessment}
              disabled={!isComplete() || submitting}
            >
              {submitting ? "提交中..." : "提交测评"}
              <CheckCircle className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
