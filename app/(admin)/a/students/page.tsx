"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Upload,
  Download,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  School,
  AlertTriangle,
  FileSpreadsheet,
  RotateCcw,
  CheckCircle,
} from "lucide-react";

interface Student {
  id: string;
  name: string;
  studentNo: string;
  gender: string;
  status: string;
  graduationYear: number;
  enrollmentDate: string;
  class: { id: string; name: string; grade: { id: string; name: string; level: number } };
  user: { email: string; id: string };
}

interface Grade {
  id: string;
  name: string;
  level: number;
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

const GENDER_OPTIONS = [
  { value: "MALE", label: "男" },
  { value: "FEMALE", label: "女" },
];

const STATUS_OPTIONS = [
  { value: "ENROLLED", label: "在读" },
  { value: "GRADUATED", label: "已毕业" },
  { value: "SUSPENDED", label: "休学" },
  { value: "TRANSFERRED", label: "已转学" },
];

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, pageSize: 20, total: 0, totalPages: 1, hasNext: false, hasPrev: false,
  });
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterGraduationYear, setFilterGraduationYear] = useState("");

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [upgradePreview, setUpgradePreview] = useState<any>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStudents = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", "20");
      if (keyword) params.set("keyword", keyword);
      if (filterGrade) params.set("gradeId", filterGrade);
      if (filterClass) params.set("classId", filterClass);
      if (filterStatus) params.set("status", filterStatus);
      if (filterGraduationYear) params.set("graduationYear", filterGraduationYear);

      const res = await fetch(`/api/admin/students?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.data || []);
        setPagination(data.pagination || pagination);
      }
    } catch (error) {
      console.error("获取学生列表失败:", error);
    } finally {
      setLoading(false);
    }
  }, [keyword, filterGrade, filterClass, filterStatus, filterGraduationYear]);

  const fetchMeta = useCallback(async () => {
    try {
      const [gRes, cRes] = await Promise.all([
        fetch("/api/admin/classes?pageSize=100"),
      ]);
      if (gRes.ok) {
        const data = await gRes.json();
        // Extract unique grades from classes
        const gradeMap = new Map();
        (data.data || []).forEach((c: any) => {
          if (c.grade && !gradeMap.has(c.grade.id)) {
            gradeMap.set(c.grade.id, c.grade);
          }
        });
        setGrades(Array.from(gradeMap.values()));
        setClasses(data.data || []);
      }
    } catch (error) {
      console.error("获取元数据失败:", error);
    }
  }, []);

  useEffect(() => {
    fetchStudents(1);
  }, [fetchStudents]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  function openCreate() {
    setEditingStudent(null);
    setFormData({
      name: "",
      studentNo: "",
      email: "",
      password: "",
      gender: "MALE",
      classId: "",
      graduationYear: new Date().getFullYear() + 3,
      status: "ENROLLED",
    });
    setEditDialogOpen(true);
  }

  function openEdit(student: Student) {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      studentNo: student.studentNo,
      email: student.user.email,
      password: "",
      gender: student.gender,
      classId: student.class.id,
      graduationYear: student.graduationYear,
      status: student.status,
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
      const url = editingStudent
        ? `/api/admin/students/${editingStudent.id}`
        : "/api/admin/students";
      const method = editingStudent ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setEditDialogOpen(false);
        fetchStudents(pagination.page);
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
      const res = await fetch(`/api/admin/students/${deletingId}`, { method: "DELETE" });
      if (res.ok) {
        setDeleteDialogOpen(false);
        fetchStudents(pagination.page);
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

  async function handleExport() {
    const params = new URLSearchParams();
    if (filterGrade) params.set("gradeId", filterGrade);
    if (filterClass) params.set("classId", filterClass);
    if (filterStatus) params.set("status", filterStatus);
    if (filterGraduationYear) params.set("graduationYear", filterGraduationYear);

    const res = await fetch(`/api/admin/students/export?${params}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `students_export_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  }

  async function handleImport() {
    if (!importFile) return;
    setActionLoading(true);
    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const res = await fetch("/api/admin/students/bulk-import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setImportResult(data);
      if (data.success > 0) {
        fetchStudents(1);
      }
    } catch (error) {
      alert("导入失败");
    } finally {
      setActionLoading(false);
    }
  }

  async function fetchUpgradePreview() {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/students/auto-upgrade", { method: "POST", body: JSON.stringify({ dryRun: true }) });
      if (res.ok) {
        const data = await res.json();
        setUpgradePreview(data);
      }
    } catch (error) {
      alert("获取升级预览失败");
    } finally {
      setActionLoading(false);
    }
  }

  async function executeUpgrade() {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/students/auto-upgrade", { method: "POST", body: JSON.stringify({ dryRun: false }) });
      if (res.ok) {
        const data = await res.json();
        setUpgradePreview(data);
        fetchStudents(1);
      }
    } catch (error) {
      alert("升级失败");
    } finally {
      setActionLoading(false);
    }
  }

  function getCurrentGradeLabel(graduationYear: number): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const academicYear = month >= 8 ? year : year - 1;
    const level = graduationYear - academicYear;
    const map: Record<number, string> = { 3: "高一", 2: "高二", 1: "高三" };
    return map[level] || (level > 3 ? "未入学" : "已毕业");
  }

  const filteredClasses = filterGrade
    ? classes.filter((c) => c.grade.name === grades.find((g) => g.id === filterGrade)?.name)
    : classes;

  // Graduation year options (next 10 years)
  const graduationYears = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">学生管理</h1>
          <p className="text-muted-foreground">全校学生信息管理 · 支持 Excel 批量导入导出</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setImportFile(null); setImportResult(null); setImportDialogOpen(true); }}>
            <Upload className="h-4 w-4 mr-1" />
            Excel导入
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            导出Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setUpgradePreview(null); setUpgradeDialogOpen(true); }}>
            <ArrowUpCircle className="h-4 w-4 mr-1" />
            自动升班
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            新增学生
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
                placeholder="搜索姓名、学号、邮箱..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchStudents(1)}
                className="h-9"
              />
            </div>
            <Select value={filterGrade} onValueChange={(v) => { setFilterGrade(v); setFilterClass(""); }}>
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
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="班级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部班级</SelectItem>
                {filteredClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.grade.name}{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[100px] h-9">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterGraduationYear} onValueChange={setFilterGraduationYear}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue placeholder="毕业年份" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部</SelectItem>
                {graduationYears.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}级</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => { setKeyword(""); setFilterGrade(""); setFilterClass(""); setFilterStatus(""); setFilterGraduationYear(""); }}>
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
            学生列表
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
                      <TableHead className="w-[60px]">学号</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>性别</TableHead>
                      <TableHead>班级</TableHead>
                      <TableHead>计算年级</TableHead>
                      <TableHead>毕业年份</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          暂无学生数据
                        </TableCell>
                      </TableRow>
                    ) : (
                      students.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-mono text-xs">{s.studentNo}</TableCell>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.gender === "FEMALE" ? "女" : "男"}</TableCell>
                          <TableCell>{s.class.grade.name}{s.class.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {getCurrentGradeLabel(s.graduationYear)}
                            </Badge>
                          </TableCell>
                          <TableCell>{s.graduationYear}级</TableCell>
                          <TableCell>
                            <Badge variant={s.status === "ENROLLED" ? "default" : "secondary"} className="text-xs">
                              {STATUS_OPTIONS.find((o) => o.value === s.status)?.label || s.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => openDelete(s.id)}>
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

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => fetchStudents(pagination.page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => fetchStudents(pagination.page + 1)}>
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
            <DialogTitle>{editingStudent ? "编辑学生" : "新增学生"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>姓名 *</Label>
                <Input value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>学号 *</Label>
                <Input value={formData.studentNo || ""} onChange={(e) => setFormData({ ...formData, studentNo: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>邮箱 *</Label>
                <Input type="email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>密码 {editingStudent ? "(留空不修改)" : "(默认: student123)"}</Label>
                <Input type="password" value={formData.password || ""} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={editingStudent ? "不修改" : "student123"} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>性别</Label>
                <Select value={formData.gender || "MALE"} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={formData.status || "ENROLLED"} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>班级 *</Label>
                <Select value={formData.classId || ""} onValueChange={(v) => setFormData({ ...formData, classId: v })}>
                  <SelectTrigger><SelectValue placeholder="选择班级" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.grade.name}{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>毕业年份 *</Label>
                <Input type="number" value={formData.graduationYear || ""} onChange={(e) => setFormData({ ...formData, graduationYear: parseInt(e.target.value) })} />
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
              删除学生将同时删除其用户账户和所有关联数据（评语、成绩、活动等）。此操作不可撤销。
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

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Excel 批量导入
            </DialogTitle>
            <DialogDescription>
              上传 Excel 文件批量导入学生。必填列：姓名、学号、邮箱、班级、毕业年份。可选列：性别、密码、年级。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!importResult ? (
              <>
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {importFile ? importFile.name : "点击选择或拖拽 Excel 文件到此处"}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground">
                  <p className="font-medium mb-1">班级名称格式示例：</p>
                  <p>"高一1班" 或 年级列填"高一"、班级列填"1班"</p>
                  <p className="mt-1">性别：男/女；毕业年份：如 2028</p>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {importResult.failed === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="font-medium">
                    成功 {importResult.success} 条，失败 {importResult.failed} 条
                  </span>
                </div>
                {importResult.details && importResult.details.length > 0 && (
                  <div className="max-h-60 overflow-y-auto border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">行</TableHead>
                          <TableHead>姓名</TableHead>
                          <TableHead>结果</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.details.map((d: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell>{d.row}</TableCell>
                            <TableCell>{d.name}</TableCell>
                            <TableCell>
                              {d.success ? (
                                <Badge variant="outline" className="text-green-600">成功</Badge>
                              ) : (
                                <span className="text-destructive text-xs">{d.error}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            {!importResult ? (
              <>
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>取消</Button>
                <Button onClick={handleImport} disabled={!importFile || actionLoading}>
                  {actionLoading ? <RotateCcw className="h-4 w-4 animate-spin mr-1" /> : null}
                  开始导入
                </Button>
              </>
            ) : (
              <Button onClick={() => { setImportResult(null); setImportFile(null); }}>继续导入</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-5 w-5" />
              自动升班
            </DialogTitle>
            <DialogDescription>
              根据毕业年份自动计算学生当前年级，并切换到对应班级。请先预览，确认无误后再执行。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!upgradePreview ? (
              <div className="text-center py-8">
                <Button onClick={fetchUpgradePreview} disabled={actionLoading}>
                  {actionLoading ? <RotateCcw className="h-4 w-4 animate-spin mr-1" /> : null}
                  预览升级结果
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 text-sm">
                  <div>总计在读: <strong>{upgradePreview.totalStudents}</strong> 人</div>
                  <div>需升级: <strong className="text-primary">{upgradePreview.upgraded}</strong> 人</div>
                  <div>错误: <strong className="text-destructive">{upgradePreview.errors}</strong> 人</div>
                </div>

                {upgradePreview.errorDetails?.length > 0 && (
                  <div className="bg-destructive/10 rounded-lg p-3 text-sm">
                    <p className="font-medium text-destructive mb-1">错误信息：</p>
                    {upgradePreview.errorDetails.map((e: any) => (
                      <p key={e.studentId} className="text-destructive/80 text-xs">{e.name}: {e.error}</p>
                    ))}
                  </div>
                )}

                {upgradePreview.upgrades?.length > 0 && (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>姓名</TableHead>
                          <TableHead>学号</TableHead>
                          <TableHead>原班级</TableHead>
                          <TableHead className="text-primary">→ 新班级</TableHead>
                          <TableHead>毕业年份</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upgradePreview.upgrades.map((u: any) => (
                          <TableRow key={u.studentId}>
                            <TableCell className="font-medium">{u.name}</TableCell>
                            <TableCell className="font-mono text-xs">{u.studentNo}</TableCell>
                            <TableCell>{u.fromClass}</TableCell>
                            <TableCell className="text-primary font-medium">{u.toClass}</TableCell>
                            <TableCell>{u.graduationYear}级</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {upgradePreview.dryRun === false && upgradePreview.upgraded > 0 && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-3">
                    <CheckCircle className="h-5 w-5" />
                    <span>升级已成功执行！</span>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            {upgradePreview?.dryRun === true && upgradePreview.upgrades?.length > 0 && (
              <Button variant="default" onClick={executeUpgrade} disabled={actionLoading}>
                {actionLoading ? <RotateCcw className="h-4 w-4 animate-spin mr-1" /> : null}
                确认执行升级
              </Button>
            )}
            <Button variant="outline" onClick={() => { setUpgradeDialogOpen(false); setUpgradePreview(null); }}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
