import { http, HttpResponse } from 'msw';
import { studentZhangMing } from './data/students';
import { mockComments12 } from './data/comments';
import { mockMilestones } from './data/milestones';
import { mockActivities } from './data/activities';
import { mockScores } from './data/scores';
import { mockMoodEntries15, mockMoodStats } from './data/mood';

export const handlers = [
  // 学生基本信息
  http.get('/api/students/me', () => {
    return HttpResponse.json({ student: studentZhangMing });
  }),

  // 聚合档案 API
  http.get('/api/students/me/profile', () => {
    return HttpResponse.json({
      student: studentZhangMing,
      fiveDimensions: studentZhangMing.fiveDimensions,
      classAverage: { 学业: 75, 心理: 70, 职业: 55, 社交: 72, 特长: 65 },
      comments: mockComments12,
      milestones: mockMilestones,
      activities: mockActivities,
      scoreSummary: {
        totalExams: 24,
        averageScoreRate: 0.86,
        subjects: [...new Set(mockScores.map((s: { subject: string }) => s.subject))],
      },
    });
  }),

  // 今日待办 API
  http.get('/api/students/me/todos', () => {
    return HttpResponse.json({
      todos: [
        { id: 'mood', text: '记录今日心情', priority: 'high' as const, completed: false },
        { id: 'assessment', text: '完成五维自评（本周未打卡）', priority: 'medium' as const, completed: false },
      ],
    });
  }),

  // 心情记录
  http.get('/api/mood', () => {
    return HttpResponse.json({ entries: mockMoodEntries15 });
  }),

  http.post('/api/mood', async ({ request }) => {
    const body = (await request.json()) as { rating: number; note?: string };
    return HttpResponse.json({
      id: 'new-mood',
      rating: body.rating,
      note: body.note || null,
      date: new Date().toISOString(),
    });
  }),

  // 心情统计
  http.get('/api/mood/stats', () => {
    return HttpResponse.json(mockMoodStats);
  }),

  // 里程碑
  http.get('/api/milestones', () => {
    return HttpResponse.json({ milestones: mockMilestones });
  }),

  http.post('/api/milestones', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({ id: 'new-ms', ...body, status: 'PENDING' });
  }),

  // 活动
  http.get('/api/activities', () => {
    return HttpResponse.json({ activities: mockActivities });
  }),

  // 成绩
  http.get('/api/scores', () => {
    return HttpResponse.json({ scores: mockScores });
  }),

  // 评语
  http.get('/api/comments', () => {
    return HttpResponse.json({ comments: mockComments12 });
  }),
];
