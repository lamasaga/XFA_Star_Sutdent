"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ALL_SCALES } from "@/lib/assessment-scales";
import { AssessmentPlayer } from "@/components/assessment-player";
import { Brain, ChevronLeft, Clock, CheckCircle } from "lucide-react";

export default function AssessmentsPage() {
  const [activeScale, setActiveScale] = useState<string | null>(null);
  const { data: session } = useSession();

  const selectedScale = ALL_SCALES.find((s) => s.id === activeScale);
  const studentId = session?.user?.studentId || "";

  if (selectedScale) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setActiveScale(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            返回
          </Button>
          <div>
            <h1 className="text-lg font-bold text-[#1a3a5c]">{selectedScale.name}</h1>
            <p className="text-sm text-slate-400">{selectedScale.description}</p>
          </div>
        </div>
        <AssessmentPlayer
          scale={selectedScale}
          studentId={studentId}
          onComplete={() => setActiveScale(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-[#1a3a5c]">心理测评</h1>
        <p className="text-sm text-slate-400 mt-0.5">选择量表开始测评，了解自己的心理状态</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ALL_SCALES.map((scale) => (
          <Card
            key={scale.id}
            className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setActiveScale(scale.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <Brain className="h-8 w-8 text-[#4a90d9]" />
                <Badge variant="outline">
                  {scale.type === "PSYCHOLOGY"
                    ? "心理测评"
                    : scale.type === "CAREER"
                    ? "职业测评"
                    : "性格测评"}
                </Badge>
              </div>
              <CardTitle className="text-[15px] text-[#1a3a5c] mt-2">{scale.name}</CardTitle>
              <CardDescription className="text-[12px]">{scale.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  约 {scale.questions.length * 0.5} 分钟
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {scale.questions.length} 题
                </span>
              </div>
              <Button className="w-full mt-4 bg-[#4a90d9] hover:bg-[#357abd]">开始测评</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
