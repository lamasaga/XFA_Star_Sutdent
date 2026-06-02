"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Search,
  FileText,
  Eye,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  getDimensionLabel,
  getGradeBenchmark,
  SIX_DIMENSIONS,
  type DimensionKey,
} from "@/lib/dimension-utils";

// 六维维度顺序
const DIMENSION_ORDER: DimensionKey[] = ["逻辑", "创新", "表达", "才情", "身心", "德行"];

interface Student {
  id: string;
  name: string;
  studentNo: string;
  className: string;
  classId: string;
  gradeName: string;
  dimensions: Record<string, number> | null;
  commentCount: number;
  milestoneCount: number;
  activityCount: number;
  hasWarning: boolean;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

type SortField = DimensionKey | null;
type SortDirection = "asc" | "desc";

export default function TeacherStudentsPage() {
  const router = useRouter();

  // 数据状态
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  // 搜索与筛选状态
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [filterWarning, setFilterWarning] = useState<string>("all");
  const [filterNoComment, setFilterNoComment] = useState<string>("all");

  // 排序状态
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  // 获取学生列表
  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("pageSize", String(pagination.pageSize));
      if (debouncedKeyword) {
        params.set("keyword", debouncedKeyword);
      }

      const res = await fetch(`/api/teachers/me/students?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setStudents(json.data || []);
        setPagination(json.pagination || pagination);
      } else {
        console.error("获取学生列表失败:", res.statusText);
      }
    } catch (error) {
      console.error("获取学生列表失败:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, debouncedKeyword]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // 客户端筛选
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // 只看预警学生
    if (filterWarning === "warning") {
      result = result.filter((s) => s.hasWarning);
    }

    // 未写评语学生
    if (filterNoComment === "no-comment") {
      result = result.filter((s) => s.commentCount === 0);
    }

    // 排序
    if (sortField) {
      result.sort((a, b) => {
        const aScore = a.dimensions?.[sortField] ?? 0;
        const bScore = b.dimensions?.[sortField] ?? 0;
        return sortDirection === "asc" ? aScore - bScore : bScore - aScore;
      });
    }

    return result;
  }, [students, filterWarning, filterNoComment, sortField, sortDirection]);

  // 处理列头点击排序
  const handleSort = (field: DimensionKey) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // 渲染排序图标
  const renderSortIcon = (field: DimensionKey) => {
    if (sortField !== field) {
      return <ChevronUp className="h-3 w-3 text-muted-foreground opacity-30" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3 w-3 text-primary" />
    ) : (
      <ChevronDown className="h-3 w-3 text-primary" />
    );
  };

  // 渲染六维分数单元格
  const renderDimensionCell = (student: Student, dimKey: DimensionKey) => {
    const score = student.dimensions?.[dimKey];
    if (score === undefined || score === null) {
      return <span className="text-muted-foreground text-xs">--</span>;
    }

    const benchmark = getGradeBenchmark(student.gradeName);
    const label = getDimensionLabel(score, benchmark);

    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-sm font-medium">{score}</span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{
            color: label.color,
            backgroundColor: label.bgColor,
          }}
        >
          {label.label}
        </span>
      </div>
    );
  };

  // 状态映射
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ENROLLED":
        return <Badge variant="default">在读</Badge>;
      case "GRADUATED":
        return <Badge variant="secondary">已毕业</Badge>;
      case "SUSPENDED":
        return <Badge variant="destructive">休学</Badge>;
      case "TRANSFERRED":
        return <Badge variant="outline">已转学</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题与搜索 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">我的学生</h1>
          <p className="text-muted-foreground">查看和管理你负责的学生</p>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="搜索姓名或学号..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterWarning} onValueChange={(v) => setFilterWarning(v || "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="预警状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部学生</SelectItem>
            <SelectItem value="warning">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                只看预警
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterNoComment} onValueChange={(v) => setFilterNoComment(v || "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="评语状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="no-comment">未写评语</SelectItem>
          </SelectContent>
        </Select>

        {(filterWarning !== "all" || filterNoComment !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterWarning("all");
              setFilterNoComment("all");
            }}
          >
            清除筛选
          </Button>
        )}

        <div className="ml-auto text-sm text-muted-foreground">
          共 {filteredStudents.length} 人
          {pagination.total > 0 && ` / 总计 ${pagination.total} 人`}
        </div>
      </div>

      {/* 学生列表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            学生列表
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">加载中...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {students.length === 0 ? "暂无负责的学生" : "没有符合条件的学生"}
              </p>
              {(filterWarning !== "all" || filterNoComment !== "all") && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setFilterWarning("all");
                    setFilterNoComment("all");
                  }}
                  className="mt-2"
                >
                  清除筛选条件
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-20">姓名</TableHead>
                    <TableHead className="w-24">学号</TableHead>
                    <TableHead className="w-28">班级</TableHead>
                    {DIMENSION_ORDER.map((dim) => (
                      <TableHead
                        key={dim}
                        className="w-20 text-center cursor-pointer select-none"
                        onClick={() => handleSort(dim)}
                      >
                        <div className="flex items-center justify-center gap-0.5">
                          <span
                            style={{
                              color: SIX_DIMENSIONS.find((d) => d.key === dim)?.color,
                            }}
                          >
                            {dim}
                          </span>
                          {renderSortIcon(dim)}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="w-20 text-center">状态</TableHead>
                    <TableHead className="w-32 text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow
                      key={student.id}
                      className={student.hasWarning ? "bg-red-50/50" : ""}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          {student.name}
                          {student.hasWarning && (
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {student.studentNo}
                      </TableCell>
                      <TableCell>{student.className}</TableCell>
                      {DIMENSION_ORDER.map((dim) => (
                        <TableCell key={dim} className="text-center">
                          {renderDimensionCell(student, dim)}
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        {getStatusBadge("ENROLLED")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              router.push(`/t/comments?studentId=${student.id}`)
                            }
                          >
                            <FileText className="h-3 w-3 mr-0.5" />
                            写评语
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() =>
                              router.push(`/t/students/${student.id}`)
                            }
                          >
                            <Eye className="h-3 w-3 mr-0.5" />
                            档案
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 分页 */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
            }
          >
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {pagination.page} / {pagination.totalPages} 页
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
            }
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}
