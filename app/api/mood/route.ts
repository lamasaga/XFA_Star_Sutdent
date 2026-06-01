import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.studentId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { rating, note, date } = body;

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return Response.json({ error: "评分必须在 1-5 之间" }, { status: 400 });
    }

    const entryDate = date ? new Date(date) : new Date();
    entryDate.setHours(0, 0, 0, 0);

    // 使用 upsert：同一天只保留一条记录
    const moodEntry = await prisma.moodEntry.upsert({
      where: {
        studentId_date: {
          studentId: session.user.studentId,
          date: entryDate,
        },
      },
      update: {
        rating,
        note: note || null,
      },
      create: {
        studentId: session.user.studentId,
        rating,
        note: note || null,
        date: entryDate,
      },
    });

    // 检查连续记录天数，计算积分
    const recentEntries = await prisma.moodEntry.findMany({
      where: { studentId: session.user.studentId },
      orderBy: { date: "desc" },
      take: 30,
    });

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const hasEntry = recentEntries.some(
        (e) => e.date.toDateString() === checkDate.toDateString()
      );
      if (hasEntry) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // 连续7天记录获得积分
    const points = streak >= 7 ? 10 : streak >= 3 ? 5 : 0;

    return Response.json({ moodEntry, streak, points });
  } catch (error) {
    console.error("保存心情记录错误:", error);
    return Response.json({ error: "保存失败" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.studentId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.moodEntry.findMany({
    where: { studentId: session.user.studentId },
    orderBy: { date: "desc" },
    take: 30,
  });

  return Response.json({ entries });
}
