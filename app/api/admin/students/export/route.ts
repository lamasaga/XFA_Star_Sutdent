import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

/**
 * GET - 导出学生数据为 Excel
 * 支持筛选条件，导出所有匹配的学生
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const gradeId = searchParams.get("gradeId");
    const status = searchParams.get("status");
    const graduationYear = searchParams.get("graduationYear");

    const where: Record<string, unknown> = {};
    if (classId) where.classId = classId;
    if (status) where.status = status;
    if (graduationYear) where.graduationYear = parseInt(graduationYear, 10);

    // gradeId 筛选
    if (gradeId) {
      const classes = await prisma.class.findMany({
        where: { gradeId },
        select: { id: true },
      });
      const classIds = classes.map((c) => c.id);
      if (classIds.length > 0) {
        where.classId = classId
          ? { in: classIds, equals: classId }
          : { in: classIds };
      }
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        class: { include: { grade: true } },
        user: { select: { email: true } },
      },
      orderBy: { studentNo: "asc" },
    });

    // 构建 Excel 数据
    const data = students.map((s) => ({
      姓名: s.name,
      学号: s.studentNo,
      邮箱: s.user.email,
      性别: s.gender === "FEMALE" ? "女" : "男",
      年级: s.class.grade.name,
      班级: s.class.name,
      完整班级: `${s.class.grade.name}${s.class.name}`,
      毕业年份: s.graduationYear,
      当前年级计算: getCurrentGradeLabel(s.graduationYear),
      状态: s.status === "ENROLLED" ? "在读" : s.status,
      入学日期: s.enrollmentDate.toISOString().split("T")[0],
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    // 设置列宽
    const colWidths = [
      { wch: 10 }, // 姓名
      { wch: 15 }, // 学号
      { wch: 25 }, // 邮箱
      { wch: 6 },  // 性别
      { wch: 8 },  // 年级
      { wch: 8 },  // 班级
      { wch: 12 }, // 完整班级
      { wch: 10 }, // 毕业年份
      { wch: 10 }, // 当前年级计算
      { wch: 8 },  // 状态
      { wch: 12 }, // 入学日期
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "学生列表");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const now = new Date();
    const filename = `students_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.xlsx`;

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("导出学生错误:", error);
    return Response.json({ error: "导出失败" }, { status: 500 });
  }
}

function getCurrentGradeLabel(graduationYear: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const academicYear = month >= 8 ? year : year - 1;
  const level = graduationYear - academicYear;

  const map: Record<number, string> = {
    3: "高一",
    2: "高二",
    1: "高三",
  };
  return map[level] || (level > 3 ? "未入学" : "已毕业");
}
