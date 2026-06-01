import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";

/**
 * POST - Excel 批量导入学生
 * 上传 Excel 文件，解析后批量创建学生和 User 账户
 *
 * Excel 列格式（支持中文表头）：
 * 姓名 | 学号 | 邮箱 | 性别 | 班级 | 年级 | 毕业年份 | 密码(可选)
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "未上传文件" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    if (rows.length < 2) {
      return Response.json({ error: "Excel 文件为空或格式错误" }, { status: 400 });
    }

    // 解析表头（支持中英文）
    const headers = (rows[0] as string[]).map((h) => String(h).trim());
    const colIndex: Record<string, number> = {};

    const headerMap: Record<string, string[]> = {
      name: ["姓名", "name", "学生姓名"],
      studentNo: ["学号", "studentNo", "学号/工号"],
      email: ["邮箱", "email", "电子邮箱"],
      gender: ["性别", "gender", "sex"],
      className: ["班级", "class", "班级名称"],
      gradeName: ["年级", "grade", "年级名称"],
      graduationYear: ["毕业年份", "graduationYear", "毕业年"],
      password: ["密码", "password", "初始密码"],
    };

    for (const [key, aliases] of Object.entries(headerMap)) {
      for (let i = 0; i < headers.length; i++) {
        if (aliases.some((a) => headers[i].toLowerCase().includes(a.toLowerCase()))) {
          colIndex[key] = i;
          break;
        }
      }
    }

    // 检查必填列
    const requiredCols = ["name", "studentNo", "email", "className", "graduationYear"];
    const missingCols = requiredCols.filter((c) => colIndex[c] === undefined);
    if (missingCols.length > 0) {
      return Response.json(
        { error: `Excel 缺少必填列: ${missingCols.join(", ")}` },
        { status: 400 }
      );
    }

    // 获取所有班级数据用于匹配
    const allClasses = await prisma.class.findMany({
      include: { grade: true },
    });

    // 构建班级查找索引："高一1班" -> classId
    const classMap = new Map<string, string>();
    for (const c of allClasses) {
      classMap.set(`${c.grade.name}${c.name}`, c.id);
      classMap.set(`${c.grade.name}-${c.name}`, c.id);
      classMap.set(c.name, c.id);
    }

    const results: Array<{
      row: number;
      name: string;
      success: boolean;
      error?: string;
    }> = [];

    const defaultPassword = await bcrypt.hash("student123", 10);
    let successCount = 0;
    let failCount = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const name = String(row[colIndex.name] ?? "").trim();
      const studentNo = String(row[colIndex.studentNo] ?? "").trim();
      const email = String(row[colIndex.email] ?? "").trim();
      const gender = String(row[colIndex.gender] ?? "男").trim();
      const className = String(row[colIndex.className] ?? "").trim();
      const graduationYear = parseInt(String(row[colIndex.graduationYear] ?? "").trim(), 10);
      const password = row[colIndex.password] ? String(row[colIndex.password]).trim() : null;

      if (!name || !studentNo || !email || !className || isNaN(graduationYear)) {
        results.push({ row: i + 1, name: name || "(空)", success: false, error: "必填字段为空" });
        failCount++;
        continue;
      }

      // 查找班级
      let classId = classMap.get(className);
      if (!classId && colIndex.gradeName !== undefined) {
        const gradeName = String(row[colIndex.gradeName] ?? "").trim();
        classId = classMap.get(`${gradeName}${className}`);
      }

      if (!classId) {
        results.push({ row: i + 1, name, success: false, error: `班级不存在: ${className}` });
        failCount++;
        continue;
      }

      // 检查学号是否已存在
      const existingStudent = await prisma.student.findUnique({
        where: { studentNo },
      });
      if (existingStudent) {
        results.push({ row: i + 1, name, success: false, error: `学号已存在: ${studentNo}` });
        failCount++;
        continue;
      }

      // 检查邮箱是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        results.push({ row: i + 1, name, success: false, error: `邮箱已存在: ${email}` });
        failCount++;
        continue;
      }

      try {
        await prisma.user.create({
          data: {
            email,
            password: password ? await bcrypt.hash(password, 10) : defaultPassword,
            name,
            role: "STUDENT",
            status: "ACTIVE",
            student: {
              create: {
                name,
                studentNo,
                gender: gender === "女" || gender.toLowerCase() === "female" ? "FEMALE" : "MALE",
                classId,
                graduationYear,
                enrollmentDate: new Date(),
                status: "ENROLLED",
              },
            },
          },
        });

        results.push({ row: i + 1, name, success: true });
        successCount++;
      } catch (error) {
        results.push({
          row: i + 1,
          name,
          success: false,
          error: error instanceof Error ? error.message : "创建失败",
        });
        failCount++;
      }
    }

    return Response.json({
      total: rows.length - 1,
      success: successCount,
      failed: failCount,
      details: results,
    });
  } catch (error) {
    console.error("批量导入错误:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "导入失败" },
      { status: 500 }
    );
  }
}
