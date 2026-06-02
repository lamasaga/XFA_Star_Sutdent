"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Brain,
  TrendingDown,
  Scale,
  UserX,
  CheckCircle,
  Eye,
  MessageCircle,
  ArrowRightLeft,
  Loader2,
  Filter,
  RefreshCw,
} from "lucide-react";

interface WarningStudent {
  id: string;
  name: string;
  studentNo: string;
  class: {
    name: string;
    grade: { name: string };
  };
}

interface Warning {
  id: string;
  type: string;
  severity: string;
  description: string;
  triggeredAt: string;
  status: string;
  resolution: string | null;
  student: WarningStudent;
}

interface WarningStats {
  PSYCHOLOGY: number;
  IMBALANCE: number;
  DECAY: number;
  DISCIPLINE: number;
  LOW_ENGAGEMENT: number;
  total: number;
  highSeverity: number;
  pending: number;
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  PSYCHOLOGY: { label: "心理预警", icon: Brain, color: "text-purple-600" },
  IMBALANCE: { label: "偏科预警", icon: Scale, color: "text-orange-600" },
  DECAY: { label: "衰减预警", icon: TrendingDown, color: "text-blue-600" },
  DISCIPLINE: { label: "纪律预警", icon: AlertTriangle, color: "text-red-600" },
  LOW_ENGAGEMENT: { label: "低参与预警", icon: UserX, color: "text-slate-600" },
};

const SEVERITY_CONFIG: Record<string, { label: string; badge: string }> = {
  HIGH: { label: "高", badge: "bg-red-100 text-red-700 border-red-200" },
  MEDIUM: { label: "中", badge: "bg-orange-100 text-orange-700 border-orange-200" },
  LOW: { label: "低", badge: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  INFO: { label: "提示", badge: "bg-blue-100 text-blue-700 border-blue-200" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待处理", color: "text-red-600" },
  PROCESSING: { label: "处理中", color: "text-orange-600" },
  RESOLVED: { label: "已解决", color: "text-green-600" },
  OBSERVING: { label: "观察中", color: "text-blue-600" },
};

const ACTION_OPTIONS = [
  { value: "RESOLVE", label: "已面谈", icon: CheckCircle, description: "已与学生面谈沟通" },
  { value: "REFER", label: "转介心理老师", icon: ArrowRightLeft, description: "转介给心理老师进一步评估" },
  { value: "COMMUNICATE", label: "家校沟通", icon: MessageCircle, description: "已联系家长沟通" },
  { value: "OBSERVE", label: "持续关注", icon: Eye, description: "转为持续观察状态" },
];

export default function WarningsPage() {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [stats, setStats] = useState<WarningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 处理弹窗状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState<Warning | null>(null);
  const [actionType, setActionType] = useState<string>("");
  const [resolution, setResolution] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWarnings();
  }, [filterType]);

  async function fetchWarnings() {
    setLoading(true);
    try {
      const url = filterType !== "ALL" ? `/api/warnings?type=${filterType}` : "/api/warnings";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setWarnings(data.warnings || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error("获取预警列表失败:", error);
    } finally {
      setLoading(false);
    }
  }

  function openActionDialog(warning: Warning) {
    setSelectedWarning(warning);
    setActionType("");
    setResolution("");
    setDialogOpen(true);
  }

  async function handleAction() {
    if (!selectedWarning || !actionType) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/warnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warningId: selectedWarning.id,
          action: actionType,
          resolution,
        }),
      });

      if (res.ok) {
        setDialogOpen(false);
        await fetchWarnings();
      } else {
        const err = await res.json();
        alert(err.error || "处理失败");
      }
    } catch (error) {
      console.error("处理预警失败:", error);
      alert("处理失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  async function triggerDetect() {
    setProcessingId("detect");
    try {
      const res = await fetch("/api/warnings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        await fetchWarnings();
      } else {
        const err = await res.json();
        alert(err.error || "检测失败");
      }
    } catch (error) {
      console.error("触发检测失败:", error);
    } finally {
      setProcessingId(null);
    }
  }

  const filteredWarnings = warnings;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">预警中心</h1>
          <p className="text-muted-foreground">关注需要干预的学生，及时介入支持</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={triggerDetect}
          disabled={processingId === "detect"}
        >
          {processingId === "detect" ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          重新检测
        </Button>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-xl font-bold text-red-600">{stats.total}</p>
                  <p className="text-xs text-red-600/80">全部预警</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-xl font-bold text-purple-600">{stats.PSYCHOLOGY}</p>
                  <p className="text-xs text-purple-600/80">心理预警</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-xl font-bold text-orange-600">{stats.IMBALANCE}</p>
                  <p className="text-xs text-orange-600/80">偏科预警</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xl font-bold text-blue-600">{stats.DECAY}</p>
                  <p className="text-xs text-blue-600/80">衰减预警</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-slate-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-xl font-bold text-slate-600">{stats.LOW_ENGAGEMENT}</p>
                  <p className="text-xs text-slate-600/80">低参与预警</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-xl font-bold text-red-600">{stats.highSeverity}</p>
                  <p className="text-xs text-red-600/80">高危预警</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 筛选栏 */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterType === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType("ALL")}
          >
            全部
          </Button>
          {Object.entries(TYPE_CONFIG).map(([key, config]) => (
            <Button
              key={key}
              variant={filterType === key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(key)}
            >
              <config.icon className={`h-3.5 w-3.5 mr-1 ${config.color}`} />
              {config.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 预警列表 */}
      <Card>
        <CardHeader>
          <CardTitle>预警列表</CardTitle>
          <CardDescription>
            共 {filteredWarnings.length} 条预警，按严重程度排序
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">加载中...</span>
            </div>
          ) : filteredWarnings.length === 0 ? (
            <div className="flex items-center justify-center gap-2 text-green-600 py-12">
              <CheckCircle className="h-5 w-5" />
              <p>暂无预警记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWarnings.map((warning) => {
                const typeConfig = TYPE_CONFIG[warning.type] || {
                  label: warning.type,
                  icon: AlertTriangle,
                  color: "text-slate-600",
                };
                const severityConfig = SEVERITY_CONFIG[warning.severity] || {
                  label: warning.severity,
                  badge: "bg-slate-100 text-slate-700",
                };
                const statusConfig = STATUS_CONFIG[warning.status] || {
                  label: warning.status,
                  color: "text-slate-600",
                };
                const TypeIcon = typeConfig.icon;
                const isResolved = warning.status === "RESOLVED";

                return (
                  <div
                    key={warning.id}
                    className={`flex items-start justify-between p-4 rounded-lg border ${
                      warning.severity === "HIGH"
                        ? "bg-red-50 border-red-100"
                        : warning.severity === "MEDIUM"
                        ? "bg-orange-50 border-orange-100"
                        : warning.severity === "LOW"
                        ? "bg-yellow-50 border-yellow-100"
                        : "bg-slate-50 border-slate-100"
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <TypeIcon className={`h-5 w-5 mt-0.5 shrink-0 ${typeConfig.color}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/t/students/${warning.student.id}`}
                            className="font-medium hover:text-[#1a3a5c] hover:underline"
                          >
                            {warning.student.name}
                          </Link>
                          <Badge variant="outline" className={severityConfig.badge}>
                            {severityConfig.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {typeConfig.label}
                          </Badge>
                          <span className={`text-xs ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {warning.student.class.grade.name}
                          {warning.student.class.name} · 学号
                          {warning.student.studentNo}
                        </p>
                        <p className="text-sm mt-1.5">{warning.description}</p>
                        {warning.resolution && (
                          <p className="text-xs text-muted-foreground mt-1">
                            处理记录：{warning.resolution}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          触发时间：
                          {new Date(warning.triggeredAt).toLocaleDateString("zh-CN")}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 shrink-0">
                      {!isResolved ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog(warning)}
                        >
                          处理
                        </Button>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          已解决
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 处理弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>处理预警</DialogTitle>
            <DialogDescription>
              {selectedWarning && (
                <>
                  学生：{selectedWarning.student.name} ·
                  {TYPE_CONFIG[selectedWarning.type]?.label || selectedWarning.type}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">选择处理方式</label>
              <div className="space-y-2">
                {ACTION_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setActionType(option.value)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                        actionType === option.value
                          ? "border-[#1a3a5c] bg-[#f0f9ff]"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 mt-0.5 shrink-0 ${
                          actionType === option.value ? "text-[#1a3a5c]" : "text-slate-400"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">处理摘要（可选）</label>
              <Textarea
                placeholder="记录处理过程、沟通要点等..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleAction}
              disabled={!actionType || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  处理中...
                </>
              ) : (
                "确认处理"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
