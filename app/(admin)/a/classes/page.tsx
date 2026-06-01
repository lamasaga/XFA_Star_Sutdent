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
  School,
  Users,
  AlertTriangle,
  RotateCcw,
  Eye,
} from "lucide-react";

interface ClassItem {
  id: string;
  name: string;
  grade: { id: string; name: string; level: number };
  students: Array<{ id: string; name: string; status: string }>;
  teacherClasses: Array<{
    id: string;
    isHomeroom: boolean;
    teacher: { id: string; name: string; teacherRole: string };
  }>;
  _count?: { students: number };
}

interface Grade {
  id: string;
  name: string;
  level: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function AdminClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, pageSize: 20, total: 0, totalPages: 1, hasNext: false, hasPrev: false,
  });
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [filterGrade, setFilterGrade] = useState("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [viewingClass, setViewingClass] = useState<ClassItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [actionLoading, setActionLoading] = useState(false);

  const fetchClasses = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "20");
      if (keyword) params.set("keyword", keyword);
      if (filterGrade) params.set("gradeId", filterGrade);

      const res = await fetch(`/api/admin/classes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setClasses(data.data || []);
        setPagination(data.pagination || pagination);
      }
    } catch (error) {
      console.error("获取班级列表失败:", error);
    } finally {
      setLoading(false);
    }
  }, [keyword, filterGrade]);

  const fetchGrades = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/classes?pageSize=100");
      if (res.ok) {
        const data = await res.json();
        const gradeMap = new Map();
        (data.data || []).forEach((c: any) => {
          if (c.grade && !gradeMap.has(c.grade.id)) {
            gradeMap.set(c.grade.id, c.grade);
          }
        });
        setGrades(Array.from(gradeMap.values()));
      }
    } catch (error) {
      console.error("获取年级失败:", error);
    }
  }, []);

  useEffect(() => {
    fetchClasses(1);
  }, [fetchClasses]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  function openCreate() {
    setEditingClass(null);
    setFormData({ name: "", gradeId: "" });
    setEditDialogOpen(true);
  }

  function openEdit(cls: ClassItem) {
    setEditingClass(cls);
    setFormData({ name: cls.name, gradeId: cls.grade.id });
    setEditDialogOpen(true);
  }

  function openDelete(id: string) {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  }

  function openDetail(cls: ClassItem) {
    setViewingClass(cls);
    setDetailDialogOpen(true);
  }

  async function handleSave() {
    setActionLoading(true);
    try {
      const url = editingClass
        ? `/api/admin/classes/${editingClass.id}`
        : "/api/admin/classes";
      const method = editingClass ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setEditDialogOpen(false);
        fetchClasses(pagination.page);
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
      const res = await fetch(`/api/admin/classes/${deletingId}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteDialogOpen(false);
        fetchClasses(pagination.page);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">班级管理</h1>
          <p className="text-muted-foreground">全校班级信息管理</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            新增班级
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
                placeholder="搜索班级名称..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchClasses(1)}
                className="h-9"
              />
            </div>
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="年级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部年级</SelectItem>
                {grades.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => { setKeyword(""); setFilterGrade(""); }}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <School className="h-5 w-5" />
            班级列表
            <Badge variant="secondary">{pagination.total} 个</Badge>
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
                      <TableHead>班级名称</TableHead>
                      <TableHead>年级</TableHead>
                      <TableHead>学生数</TableHead>
                      <TableHead>班主任</TableHead>
                      <TableHead>任课教师</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          暂无班级数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      classes.map((c) => {
                        const homeroom = c.teacherClasses.find((tc) => tc.isHomeroom)?.teacher;
                        const subjectTeachers = c.teacherClasses.filter((tc) => !tc.isHomeroom).map((tc) => tc.teacher);
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.grade.name}{c.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{c.grade.name}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>{c.students?.length || 0}</span>
                              </div>
                            </TableCell>
                            <TableCell>{homeroom ? homeroom.name : "—"}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {subjectTeachers.slice(0, 2).map((t) => (
                                  <Badge key={t.id} variant="secondary" className="text-[10px] px-1">{t.name}</Badge>
                                ))}
                                {subjectTeachers.length > 2 && (
                                  <span className="text-xs text-muted-foreground">+{subjectTeachers.length - 2}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(c)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDelete(c.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
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
                    <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => fetchClasses(pagination.page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => fetchClasses(pagination.page + 1)}>
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingClass ? "编辑班级" : "新增班级"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>年级 *</Label>
              <Select value={formData.gradeId || ""} onValueChange={(v) => setFormData({ ...formData, gradeId: v })}>
                <SelectTrigger><SelectValue placeholder="选择年级" /></SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>班级名称 *</Label>
              <Input value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="如：1班" />
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
              班级下有学生时将无法删除。请先转移或删除学生。
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

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingClass?.grade.name}{viewingClass?.name} - 班级详情</DialogTitle>
          </DialogHeader>
          {viewingClass && (
            <div className="space-y-4 py-2">
              <div>
                <h4 className="text-sm font-medium mb-2">学生列表 ({viewingClass.students?.length || 0}人)</h4>
                {viewingClass.students?.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">姓名</TableHead>
                          <TableHead className="text-xs">状态</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingClass.students.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-sm">{s.name}</TableCell>
                            <TableCell>
                              <Badge variant={s.status === "ENROLLED" ? "default" : "secondary"} className="text-[10px]">
                                {s.status === "ENROLLED" ? "在读" : s.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无学生</p>
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">教师团队</h4>
                {viewingClass.teacherClasses?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {viewingClass.teacherClasses.map((tc) => (
                      <Badge key={tc.id} variant={tc.isHomeroom ? "default" : "outline"} className="text-xs">
                        {tc.teacher.name}
                        {tc.isHomeroom && " (班主任)"}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">暂无教师</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
