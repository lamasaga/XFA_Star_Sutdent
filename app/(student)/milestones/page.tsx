"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Plus, Calendar, CheckCircle, Clock, XCircle } from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  source: string;
  occurredAt: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  ACADEMIC: "学业",
  ACTIVITY: "活动",
  COMPETITION: "比赛",
  PSYCHOLOGY: "心理",
  PERSONAL: "个人",
  GROWTH: "成长",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  APPROVED: { label: "已通过", color: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle },
  PENDING: { label: "待审核", color: "bg-yellow-100 text-yellow-700 border-yellow-300", icon: Clock },
  REJECTED: { label: "已拒绝", color: "bg-red-100 text-red-700 border-red-300", icon: XCircle },
};

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "PERSONAL",
    occurredAt: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchMilestones();
  }, []);

  async function fetchMilestones() {
    try {
      const res = await fetch("/api/milestones");
      if (res.ok) {
        const data = await res.json();
        setMilestones(data.milestones || []);
      }
    } catch (error) {
      console.error("获取里程碑失败:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!form.title.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          type: form.type,
          occurredAt: form.occurredAt,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        setForm({
          title: "",
          description: "",
          type: "PERSONAL",
          occurredAt: new Date().toISOString().split("T")[0],
        });
        fetchMilestones();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">里程碑</h1>
          <p className="text-muted-foreground">记录成长中的重要时刻</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={
            <Button>
              <Plus className="h-4 w-4 mr-1" /> 申报里程碑
            </Button>
          } />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>申报新里程碑</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>标题 *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="如：英语演讲比赛一等奖"
                />
              </div>
              <div>
                <Label>类型</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v || "PERSONAL" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACADEMIC">学业</SelectItem>
                    <SelectItem value="ACTIVITY">活动</SelectItem>
                    <SelectItem value="COMPETITION">比赛</SelectItem>
                    <SelectItem value="PSYCHOLOGY">心理</SelectItem>
                    <SelectItem value="PERSONAL">个人</SelectItem>
                    <SelectItem value="GROWTH">成长</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>发生日期</Label>
                <Input
                  type="date"
                  value={form.occurredAt}
                  onChange={(e) => setForm((p) => ({ ...p, occurredAt: e.target.value }))}
                />
              </div>
              <div>
                <Label>描述</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="描述这个里程碑的细节..."
                  rows={3}
                />
              </div>
              <Button onClick={handleSubmit} disabled={submitting || !form.title.trim()} className="w-full">
                {submitting ? "提交中..." : "提交申报"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <p className="text-muted-foreground">加载中...</p>
        ) : milestones.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">还没有里程碑，点击上方按钮申报你的第一个成就吧！</p>
            </CardContent>
          </Card>
        ) : (
          milestones.map((m) => {
            const config = STATUS_CONFIG[m.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = config.icon;
            return (
              <Card key={m.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Trophy className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{m.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {TYPE_LABELS[m.type] || m.type}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${config.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        {m.description && (
                          <p className="text-sm text-muted-foreground mt-1">{m.description}</p>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(m.occurredAt).toLocaleDateString("zh-CN")}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
