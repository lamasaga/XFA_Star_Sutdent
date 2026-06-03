"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Trophy,
  Plus,
  Search,
  Star,
  Calendar,
  Filter,
  Medal,
  Award,
  Sparkles,
} from "lucide-react";

const TYPE_MAP: Record<string, { label: string; color: string; icon: typeof Star }> = {
  ACADEMIC: { label: "学业", color: "bg-blue-100 text-blue-700", icon: Star },
  ACTIVITY: { label: "活动", color: "bg-green-100 text-green-700", icon: Sparkles },
  COMPETITION: { label: "比赛", color: "bg-red-100 text-red-700", icon: Trophy },
  PSYCHOLOGY: { label: "心理", color: "bg-purple-100 text-purple-700", icon: Award },
  PERSONAL: { label: "个人", color: "bg-orange-100 text-orange-700", icon: Medal },
  GROWTH: { label: "成长", color: "bg-teal-100 text-teal-700", icon: Star },
};

interface Milestone {
  id: string;
  title: string;
  type: string;
  occurredAt: string;
  status: string;
}

export default function MilestonesPage() {
  const [items, setItems] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "PERSONAL", occurredAt: "" });

  useEffect(() => {
    async function fetchMilestones() {
      try {
        const res = await fetch("/api/milestones?limit=100");
        if (res.ok) {
          const data = await res.json();
          setItems(data.milestones || []);
        }
      } catch (error) {
        console.error("获取里程碑失败:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchMilestones();
  }, []);

  async function submitMilestone() {
    try {
      const res = await fetch("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const result = await res.json();
        const newMilestone = result.milestone || result;
        setItems((prev) => [newMilestone, ...prev]);
        setDialogOpen(false);
        setForm({ title: "", type: "PERSONAL", occurredAt: "" });
      }
    } catch (error) {
      console.error("提交里程碑失败:", error);
    }
  }

  const filtered = items
    .filter((m) => (filterType === "ALL" ? true : m.type === filterType))
    .filter((m) => (search ? m.title.includes(search) : true));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#1a3a5c]">里程碑</h1>
          <p className="text-sm text-slate-400 mt-0.5">记录成长中的重要时刻</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={
            <Button className="bg-[#4a90d9] hover:bg-[#357abd]">
              <Plus className="h-4 w-4 mr-1" /> 申报里程碑
            </Button>
          } />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>申报新里程碑</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label className="text-[12px] text-slate-500">标题 *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="如：英语演讲比赛一等奖"
                />
              </div>
              <div>
                <Label className="text-[12px] text-slate-500">类型</Label>
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
                <Label className="text-[12px] text-slate-500">发生日期</Label>
                <Input
                  type="date"
                  value={form.occurredAt}
                  onChange={(e) => setForm((p) => ({ ...p, occurredAt: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                <Button className="bg-[#1a3a5c]" onClick={submitMilestone}>提交</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 过滤 */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="搜索里程碑..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9"
              />
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v || "ALL")}>
              <SelectTrigger className="w-[120px] h-9">
                <Filter className="h-3.5 w-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部</SelectItem>
                {Object.entries(TYPE_MAP).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 列表 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm h-24 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-slate-400">
            <Trophy className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p>暂无里程碑记录</p>
            <p className="text-xs mt-1">点击右上角按钮申报你的第一个里程碑</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((item) => {
            const meta = TYPE_MAP[item.type] || TYPE_MAP.PERSONAL;
            const Icon = meta.icon;
            return (
              <Card key={item.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${meta.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-[#1a3a5c] truncate">{item.title}</h3>
                        <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                        {item.status === "APPROVED" && (
                          <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px]">已通过</Badge>
                        )}
                        {item.status === "PENDING" && (
                          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-[10px]">审核中</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {item.occurredAt ? new Date(item.occurredAt).toLocaleDateString("zh-CN") : "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {item.status === "APPROVED" ? "已计入档案" : "待审核"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
