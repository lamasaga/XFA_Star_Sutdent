export interface MockScore {
  id: string;
  subject: string;
  score: number;
  total: number;
  scoreRate: number;
  examType: string;
  semester: string;
  examDate: string;
}

export const mockScores: MockScore[] = [
  { id: 's1', subject: '语文', score: 88, total: 100, scoreRate: 0.88, examType: '期中考试', semester: '2025-2026-2', examDate: '2026-05-25' },
  { id: 's2', subject: '数学', score: 95, total: 100, scoreRate: 0.95, examType: '期中考试', semester: '2025-2026-2', examDate: '2026-05-25' },
  { id: 's3', subject: '英语', score: 92, total: 100, scoreRate: 0.92, examType: '期中考试', semester: '2025-2026-2', examDate: '2026-05-25' },
  { id: 's4', subject: '物理', score: 85, total: 100, scoreRate: 0.85, examType: '月考', semester: '2025-2026-2', examDate: '2026-04-20' },
  { id: 's5', subject: '化学', score: 78, total: 100, scoreRate: 0.78, examType: '月考', semester: '2025-2026-2', examDate: '2026-04-20' },
];
