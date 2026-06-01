import { prisma } from "@/lib/prisma";

export interface TodoItem {
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
  action?: string;
}

export async function generateTodos(studentId: string): Promise<TodoItem[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  threeDaysLater.setHours(23, 59, 59, 999);

  const [todayMood, weekAssessment, upcomingExams] = await Promise.all([
    // 1. 今天是否已记录心情
    prisma.moodEntry.findFirst({
      where: {
        studentId,
        date: { gte: today },
      },
      select: { id: true },
    }),

    // 2. 本周是否已完成五维自评
    prisma.careerProfile.findFirst({
      where: {
        studentId,
        updatedAt: { gte: weekStart },
      },
      select: { id: true },
    }),

    // 3. 3 天内是否有考试
    prisma.exam.findMany({
      where: {
        class: {
          students: { some: { id: studentId } },
        },
        examDate: {
          gte: today,
          lte: threeDaysLater,
        },
      },
      select: {
        name: true,
        subject: true,
        examDate: true,
      },
      orderBy: { examDate: "asc" },
    }),
  ]);

  const todos: TodoItem[] = [];

  // 今日未记录心情 → high 优先级
  if (!todayMood) {
    todos.push({
      id: "mood",
      text: "记录今日心情",
      priority: "high",
      completed: false,
      action: "/mood",
    });
  }

  // 本周未完成五维自评 → medium 优先级
  if (!weekAssessment) {
    todos.push({
      id: "assessment",
      text: "完成五维自评（本周未打卡）",
      priority: "medium",
      completed: false,
      action: "/assessments",
    });
  }

  // 3 天内有考试 → medium 优先级
  for (const exam of upcomingExams) {
    todos.push({
      id: `exam-${exam.subject}`,
      text: `${exam.subject}月考复习提醒`,
      priority: "medium",
      completed: false,
    });
  }

  return todos;
}
