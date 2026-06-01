"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertTriangle,
  RotateCcw,
  BookOpen,
} from "lucide-react";

interface Teacher {
  id: string;
  name: string;
  title: string | null;
  teacherRole: string;
  subjects: string;
  user: { email: string; id: string };
  teacherClasses: Array<{
    id: string;
    isHomeroom: boolean;
    class: { id: string; name: string; grade: { name: string } };
  }>;
  _count: { comments: number; teacherClasses: number };
}

interface ClassOption {
  id: string;
  name: string;
  grade: { name: string };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  HOMEROOM: "班主任",
  SUBJECT: "学科教师",
  PSYCHOLOGY: "心理老师",
  CAREER: "职业规划",
  ADMIN: "管理员",
};

const ROLE_OPTIONS = [
  { value: "HOMEROOM", label: "班主任" },
  { value: "SUBJECT", label: "学科教师" },
  { value: "PSYCHOLOGY", label: "心理老师" },
  { value: "CAREER", label: "职业规划" },
];

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, pageSize: 20, total: 0, totalPages: 1, hasNext: false, hasPrev: false,
  });
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [filterRole, setFilterRole] = useState("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTeachers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "20");
      if (keyword) params.set("keyword", keyword);
      if (filterRole) params.set("teacherRole", filterRole);

      const res = await fetch(`/api/admin/teachers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.data || []);
        setPagination(data.pagination || pagination);
      }
    } catch (error) {
      console.error("获取教师列表失败:", error);
    } finally {
      setLoading(false);
    }
  }, [keyword, filterRole]);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/classes?pageSize=100");
      if (res.ok) {
        const data = await res.json();
        setClasses(data.data || []);
      }
    } catch (error) {
      console.error("获取班级失败:", error);
    }
  }, []);

  useEffect(() => {
    fetchTeachers(1);
  }, [fetchTeachers]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  function openCreate() {
    setEditingTeacher(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      title: "",
      subjects: ["语文"],
      teacherRole: "SUBJECT",
      classIds: [],
    });
    setEditDialogOpen(true);
  }

  function openEdit(teacher: Teacher) {
    setEditingTeacher(teacher);
    const parsedSubjects = (() => {
      try { return JSON.parse(teacher.subjects); } catch { return [teacher.subjects]; }
    })();
    setFormData({
      name: teacher.name,
      email: teacher.user.email,
      password: "",
      title: teacher.title || "",
      subjects: Array.isArray(parsedSubjects) ? parsedSubjects : [parsedSubjects],
      teacherRole: teacher.teacherRole,
      classIds: teacher.teacherClasses.map((tc) => tc.class.id),
    });
    setEditDialogOpen(true);
  }

  function openDelete(id: string) {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    setActionLoading(true);
    try {
      const url = editingTeacher
        ? `/api/admin/teachers/${editingTeacher.id}`
        : "/api/admin/teachers";
      const method = editingTeacher ? "PUT" : "POST";

      const payload = { ...formData };
      if (!payload.password) delete payload.password;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditDialogOpen(false);
        fetchTeachers(pagination.page);
      } else {
        const err = await res.json();
        alert(err.error || "操作失败");
      }
    } catch (error) {
      alert("操作失败");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/teachers/${deletingId}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteDialogOpen(false);
        fetchTeachers(pagination.page);
      } else {
        const err = await res.json();
        alert(err.error || "删除失败");
      }
    } catch (error) {
      alert("删除失败");
    } finally {
      setActionLoading(false);
    }
  }

  function toggleClass(classId: string) {
    const current = formData.classIds || [];
    if (current.includes(classId)) {
      setFormData({ ...formData, classIds: current.filter((id: string) => id !== classId) });
    } else {
      setFormData({ ...formData, classIds: [...current, classId] });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">教师管理</h1>
          <p className="text-muted-foreground">全校教师信息管理</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            新增教师
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="搜索姓名、邮箱、职称..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchTeachers(1)}
                className="h-9"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部角色</SelectItem>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => { setKeyword(""); setFilterRole(""); }}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            教师列表
            <Badge variant="secondary">{pagination.total} 人</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RotateCcw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>职称</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>任教科目</TableHead>
                      <TableHead>任教班级</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          暂无教师数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      teachers.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{t.user.email}</TableCell>
                          <TableCell>{t.title || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {ROLE_LABELS[t.teacherRole] || t.teacherRole}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                try {
                                  const subs = JSON.parse(t.subjects);
                                  return Array.isArray(subs) ? subs.map((s: string) => (
                                    <Badge key={s} variant="secondary" className="text-[10px] px-1">{s}</Badge>
                                  )) : <span className="text-xs text-muted-foreground">{t.subjects}</span>;
                                } catch {
                                  return <span className="text-xs text-muted-foreground">{t.subjects}</span>;
                                }
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {t.teacherClasses.slice(0, 3).map((tc) => (
                                <Badge key={tc.id} variant="outline" className="text-[10px] px-1">
                                  {tc.class.grade.name}{tc.class.name}
                                  {tc.isHomeroom && "(班)"}
                                </Badge>
                              ))}
                              {t.teacherClasses.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{t.teacherClasses.length - 3}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDelete(t.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => fetchTeachers(pagination.page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => fetchTeachers(pagination.page + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTeacher ? "编辑教师" : "新增教师"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>姓名 *</Label>
                <Input value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>邮箱 *</Label>
                <Input type="email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>密码 {editingTeacher ? "(留空不修改)" : "(默认: teacher123)"}</Label>
                <Input type="password" value={formData.password || ""} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>职称</Label>
                <Input value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="如：高级教师" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>角色</Label>
                <Select value={formData.teacherRole || "SUBJECT"} onValueChange={(v) => setFormData({ ...formData, teacherRole: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>任教科目（逗号分隔）</Label>
                <Input
                  value={Array.isArray(formData.subjects) ? formData.subjects.join(", ") : formData.subjects || ""}
                  onChange={(e) => setFormData({ ...formData, subjects: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) })}
                  placeholder="如：语文, 数学"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>任教班级（可多选）</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-1">
                {classes.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted rounded px-2 py-1">
                    <input
                      type="checkbox"
                      checked={(formData.classIds || []).includes(c.id)}
                      onChange={() => toggleClass(c.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{c.grade.name}{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={actionLoading}>
              {actionLoading ? <RotateCcw className="h-4 w-4 animate-spin mr-1" /> : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              确认删除
            </DialogTitle>
            <DialogDescription>
              删除教师将同时删除其用户账户和所有关联数据（评语、班级关系等）。此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
              {actionLoading ? <RotateCcw className="h-4 w-4 animate-spin mr-1" /> : null}
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
