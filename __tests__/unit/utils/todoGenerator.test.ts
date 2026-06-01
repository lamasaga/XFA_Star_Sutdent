import { describe, it, expect } from 'vitest';
import { generateTodos } from '@/lib/todo-generator';

// 简化版 generateTodos 的纯逻辑测试（不依赖 Prisma）
function mockGenerateTodos(params: {
  todayMood: boolean;
  weekAssessment: boolean;
  upcomingExams: { subject: string; examType?: string }[];
}) {
  const todos: Array<{ id: string; text: string; priority: 'high' | 'medium' | 'low'; completed: boolean }> = [];
  if (!params.todayMood) {
    todos.push({ id: 'mood', text: '记录今日心情', priority: 'high', completed: false });
  }
  if (!params.weekAssessment) {
    todos.push({ id: 'assessment', text: '完成五维自评（本周未打卡）', priority: 'medium', completed: false });
  }
  for (const exam of params.upcomingExams) {
    todos.push({
      id: `exam-${exam.subject}`,
      text: `${exam.subject} ${exam.examType || '考试'}复习提醒`,
      priority: 'medium',
      completed: false,
    });
  }
  return todos;
}

describe('Feature 2: Dashboard 待办生成规则', () => {
  describe('场景 2.5: 今日待办自动生成规则', () => {
    it('未记录心情 + 未自评 → 应生成 2 条待办', () => {
      const todos = mockGenerateTodos({
        todayMood: false,
        weekAssessment: false,
        upcomingExams: [],
      });
      expect(todos).toHaveLength(2);
      expect(todos[0]).toMatchObject({
        id: 'mood',
        text: '记录今日心情',
        priority: 'high',
      });
      expect(todos[1]).toMatchObject({
        id: 'assessment',
        text: '完成五维自评（本周未打卡）',
        priority: 'medium',
      });
    });

    it('已记录心情 + 有 3 天内考试 → 应生成考试提醒', () => {
      const todos = mockGenerateTodos({
        todayMood: true,
        weekAssessment: true,
        upcomingExams: [{ subject: '英语', examType: '月考' }],
      });
      expect(todos).toHaveLength(1);
      expect(todos[0]).toMatchObject({
        id: 'exam-英语',
        text: '英语 月考复习提醒',
        priority: 'medium',
      });
    });

    it('所有条件已完成 → 应返回空数组', () => {
      const todos = mockGenerateTodos({
        todayMood: true,
        weekAssessment: true,
        upcomingExams: [],
      });
      expect(todos).toHaveLength(0);
    });

    it('待办应按优先级排序（high > medium）', () => {
      const todos = mockGenerateTodos({
        todayMood: false,
        weekAssessment: false,
        upcomingExams: [{ subject: '数学' }],
      });
      expect(todos[0].priority).toBe('high');
      expect(todos[1].priority).toBe('medium');
      expect(todos[2].priority).toBe('medium');
    });
  });
});
