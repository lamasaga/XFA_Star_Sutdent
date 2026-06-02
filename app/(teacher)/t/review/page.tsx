"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trophy,
  Target,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  User,
  FileText,
  Award,
  ExternalLink,
} from "lucide-react";

// ==================== 类型定义 ====================

interface ReviewStudent {
  id: string;
  name: string;
  studentNo: string;
  class: {
    name: string;
    grade: { name: string };
  };
}

interface Milestone {
  id: string;
  type: string;
  title: string;
  description: string | null;
  source: string;
  status: string;
  occurredAt: string;
  relatedData: string | null;
  createdAt: string;
  student: ReviewStudent;
}

interface Activity {
  id: string;
  name: string;
  category: string;
  type: string;
  role: string;
  result: string | null;
  startDate: string;
  endDate: string | null;
  proofFiles: string | null;
  status: string;
  points: number;
  createdAt: string;
  student: ReviewStudent;
}

// ==================== 常量 ====================

const MILESTONE_TYPE_LABELS: Record<string, string> = {
  COMPETITION: "竞赛获奖",
  EXAM: "考试突破",
  PROJECT: "项目成果",
  CERTIFICATE: "获得证书",
  HONOR: "荣誉称号",
  OTHER: "其他",
};

const ACTIVITY_CATEGORY_LABELS: Record<string, string> = {
  ACADEMIC: "学术",
  ARTS: "艺术",
  SPORTS: "体育",
  SOCIAL: "社会实践",
  VOLUNTEER: "志愿服务",
  LEADERSHIP: "领导力",
  OTHER: "其他",
};

// ==================== 主组件 ====================

export default function ReviewPage() {
  const [activeTab, setActiveTab] = useState("milestones");

  // 里程碑状态
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(true);
  const [selectedMilestones, setSelectedMilestones] = useState<Set<string>>(
    new Set()
  );

  // 活动记录状态
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(
    new Set()
  );

  // 弹窗状态
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<Milestone | Activity | null>(
    null
  );
  const [currentItemType, setCurrentItemType] = useState<
    "milestone" | "activity"
  >("milestone");
  const [rejectReason, setRejectReason] = useState("");
  const [awardPoints, setAwardPoints] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMilestones();
    fetchActivities();
  }, []);

  async function fetchMilestones() {
    setMilestonesLoading(true);
    try {
      const res = await fetch("/api/teachers/me/review/milestones");
      if (res.ok) {
        const data = await res.json();
        setMilestones(data.milestones || []);
      }
    } catch (error) {
      console.error("获取里程碑失败:", error);
    } finally {
      setMilestonesLoading(false);
    }
  }

  async function fetchActivities() {
    setActivitiesLoading(true);
    try {
      const res = await fetch("/api/teachers/me/review/activities");
      if (res.ok) {
        const data = await res.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error("获取活动记录失败:", error);
    } finally {
      setActivitiesLoading(false);
    }
  }

  // ==================== 选择操作 ====================

  function toggleSelectAll(
    items: Milestone[] | Activity[],
    selected: Set<string>,
    setSelected: (s: Set<string>) => void
  ) {
    if (selected.size === items.length && items.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((item) => item.id)));
    }
  }

  function toggleSelect(
    id: string,
    selected: Set<string>,
    setSelected: (s: Set<string>) => void
  ) {
    const newSet = new Set(selected);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelected(newSet);
  }

  // ==================== 单个操作 ====================

  function openApproveDialog(item: Milestone | Activity, type: "milestone" | "activity") {
    setCurrentItem(item);
    setCurrentItemType(type);
    setAwardPoints("");
    setApproveDialogOpen(true);
  }

  function openRejectDialog(item: Milestone | Activity, type: "milestone" | "activity") {
    setCurrentItem(item);
    setCurrentItemType(type);
    setRejectReason("");
    setRejectDialogOpen(true);
  }

  async function handleApprove() {
    if (!currentItem) return;

    setSubmitting(true);
    try {
      if (currentItemType === "milestone") {
        const res = await fetch(
          `/api/teachers/me/review/milestones/${currentItem.id}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              points: awardPoints ? parseInt(awardPoints) : undefined,
            }),
          }
        );
        if (res.ok) {
          setApproveDialogOpen(false);
          await fetchMilestones();
        } else {
          const err = await res.json();
          alert(err.error || "审核失败");
        }
      } else {
        const res = await fetch("/api/teachers/me/review/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activityId: currentItem.id,
            points: awardPoints ? parseInt(awardPoints) : undefined,
          }),
        });
        if (res.ok) {
          setApproveDialogOpen(false);
          await fetchActivities();
        } else {
          const err = await res.json();
          alert(err.error || "确认失败");
        }
      }
    } catch (error) {
      console.error("审核失败:", error);
      alert("操作失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!currentItem || !rejectReason.trim()) return;

    setSubmitting(true);
    try {
      if (currentItemType === "milestone") {
        const res = await fetch(
          `/api/teachers/me/review/milestones/${currentItem.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: rejectReason }),
          }
        );
        if (res.ok) {
          setRejectDialogOpen(false);
          await fetchMilestones();
        } else {
          const err = await res.json();
          alert(err.error || "驳回失败");
        }
      } else {
        const res = await fetch("/api/teachers/me/review/activities", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activityId: currentItem.id,
            reason: rejectReason,
          }),
        });
        if (res.ok) {
          setRejectDialogOpen(false);
          await fetchActivities();
        } else {
          const err = await res.json();
          alert(err.error || "驳回失败");
        }
      }
    } catch (error) {
      console.error("驳回失败:", error);
      alert("操作失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  // ==================== 批量操作 ====================

  async function handleBatchApprove() {
    const ids =
      activeTab === "milestones"
        ? Array.from(selectedMilestones)
        : Array.from(selectedActivities);
    if (ids.length === 0) return;

    setSubmitting(true);
    try {
      if (activeTab === "milestones") {
        await Promise.all(
          ids.map((id) =>
            fetch(`/api/teachers/me/review/milestones/${id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            })
          )
        );
        setSelectedMilestones(new Set());
        await fetchMilestones();
      } else {
        await Promise.all(
          ids.map((id) =>
            fetch("/api/teachers/me/review/activities", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ activityId: id }),
            })
          )
        );
        setSelectedActivities(new Set());
        await fetchActivities();
      }
    } catch (error) {
      console.error("批量审核失败:", error);
      alert("部分操作可能失败，请刷新查看");
    } finally {
      setSubmitting(false);
    }
  }

  // ==================== 渲染 ====================

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">审核中心</h1>
        <p className="text-muted-foreground">
          审核学生申报的里程碑和活动记录
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="milestones" className="gap-1.5">
            <Trophy className="h-4 w-4" />
            里程碑审核
            {milestones.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {milestones.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activities" className="gap-1.5">
            <Target className="h-4 w-4" />
            活动记录审核
            {activities.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {activities.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 里程碑审核 Tab */}
        <TabsContent value="milestones" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    待审核里程碑
                  </CardTitle>
                  <CardDescription>
                    共 {milestones.length} 条待审核记录
                  </CardDescription>
                </div>
                {selectedMilestones.size > 0 && (
                  <Button
                    size="sm"
                    onClick={handleBatchApprove}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    批量通过 ({selectedMilestones.size})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {milestonesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">加载中...</span>
                </div>
              ) : milestones.length === 0 ? (
                <div className="flex items-center justify-center gap-2 text-green-600 py-12">
                  <CheckCircle className="h-5 w-5" />
                  <p>暂无待审核的里程碑</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            selectedMilestones.size === milestones.length &&
                            milestones.length > 0
                          }
                          onCheckedChange={() =>
                            toggleSelectAll(
                              milestones,
                              selectedMilestones,
                              setSelectedMilestones
                            )
                          }
                        />
                      </TableHead>
                      <TableHead>申报人</TableHead>
                      <TableHead>标题</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>时间</TableHead>
                      <TableHead>证明材料</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {milestones.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedMilestones.has(m.id)}
                            onCheckedChange={() =>
                              toggleSelect(
                                m.id,
                                selectedMilestones,
                                setSelectedMilestones
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {m.student.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {m.student.class.grade.name}
                                {m.student.class.name}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{m.title}</p>
                          {m.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {m.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {MILESTONE_TYPE_LABELS[m.type] || m.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(m.occurredAt).toLocaleDateString("zh-CN")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {m.relatedData ? (
                            <div className="flex items-center gap-1 text-sm text-[#1a3a5c]">
                              <FileText className="h-3.5 w-3.5" />
                              <span className="text-xs">有</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              无
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => openApproveDialog(m, "milestone")}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              通过
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => openRejectDialog(m, "milestone")}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              驳回
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 活动记录审核 Tab */}
        <TabsContent value="activities" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-500" />
                    待审核活动记录
                  </CardTitle>
                  <CardDescription>
                    共 {activities.length} 条待审核记录
                  </CardDescription>
                </div>
                {selectedActivities.size > 0 && (
                  <Button
                    size="sm"
                    onClick={handleBatchApprove}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    )}
                    批量确认 ({selectedActivities.size})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">加载中...</span>
                </div>
              ) : activities.length === 0 ? (
                <div className="flex items-center justify-center gap-2 text-green-600 py-12">
                  <CheckCircle className="h-5 w-5" />
                  <p>暂无待审核的活动记录</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            selectedActivities.size === activities.length &&
                            activities.length > 0
                          }
                          onCheckedChange={() =>
                            toggleSelectAll(
                              activities,
                              selectedActivities,
                              setSelectedActivities
                            )
                          }
                        />
                      </TableHead>
                      <TableHead>申报人</TableHead>
                      <TableHead>活动名称</TableHead>
                      <TableHead>类别</TableHead>
                      <TableHead>角色/成果</TableHead>
                      <TableHead>时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedActivities.has(a.id)}
                            onCheckedChange={() =>
                              toggleSelect(
                                a.id,
                                selectedActivities,
                                setSelectedActivities
                              )
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">
                                {a.student.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {a.student.class.grade.name}
                                {a.student.class.name}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{a.name}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {ACTIVITY_CATEGORY_LABELS[a.category] || a.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="text-muted-foreground">
                              {a.role}
                            </span>
                            {a.result && (
                              <span className="text-[#1a3a5c] ml-1">
                                · {a.result}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(a.startDate).toLocaleDateString("zh-CN")}
                            {a.endDate &&
                              a.endDate !== a.startDate &&
                              ` ~ ${new Date(a.endDate).toLocaleDateString(
                                "zh-CN"
                              )}`}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => openApproveDialog(a, "activity")}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              确认
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => openRejectDialog(a, "activity")}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              驳回
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 通过弹窗 */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              确认通过
            </DialogTitle>
            <DialogDescription>
              {currentItem && (
                <>
                  {currentItemType === "milestone"
                    ? (currentItem as Milestone).title
                    : (currentItem as Activity).name}
                  {" · "}
                  {currentItem.student.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">
                <div className="flex items-center gap-1">
                  <Award className="h-4 w-4" />
                  奖励积分（可选）
                </div>
              </label>
              <input
                type="number"
                placeholder="输入积分数量"
                value={awardPoints}
                onChange={(e) => setAwardPoints(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                通过后将自动增加对应维度的分数
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
            >
              取消
            </Button>
            <Button onClick={handleApprove} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  处理中...
                </>
              ) : (
                "确认通过"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 驳回弹窗 */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              确认驳回
            </DialogTitle>
            <DialogDescription>
              {currentItem && (
                <>
                  {currentItemType === "milestone"
                    ? (currentItem as Milestone).title
                    : (currentItem as Activity).name}
                  {" · "}
                  {currentItem.student.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">
                驳回理由 <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="请填写驳回理由，帮助学生了解原因..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting || !rejectReason.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  处理中...
                </>
              ) : (
                "确认驳回"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
