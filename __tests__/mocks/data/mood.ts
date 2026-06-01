export interface MockMoodEntry {
  id: string;
  rating: number;
  note: string | null;
  date: string;
}

export const mockMoodEntries15: MockMoodEntry[] = [
  { id: 'mood-0', rating: 4, note: '今天感觉不错', date: '2026-06-01' },
  { id: 'mood-1', rating: 3, note: null, date: '2026-05-31' },
  { id: 'mood-2', rating: 5, note: '数学竞赛获奖了！', date: '2026-05-30' },
  { id: 'mood-3', rating: 4, note: null, date: '2026-05-29' },
  { id: 'mood-4', rating: 3, note: null, date: '2026-05-28' },
  { id: 'mood-5', rating: 4, note: null, date: '2026-05-27' },
  { id: 'mood-6', rating: 2, note: '考试没考好', date: '2026-05-26' },
  { id: 'mood-7', rating: 3, note: null, date: '2026-05-25' },
  { id: 'mood-8', rating: 4, note: null, date: '2026-05-24' },
  { id: 'mood-9', rating: 4, note: null, date: '2026-05-23' },
  { id: 'mood-10', rating: 5, note: '周末很开心', date: '2026-05-22' },
  { id: 'mood-11', rating: 3, note: null, date: '2026-05-21' },
  { id: 'mood-12', rating: 4, note: null, date: '2026-05-20' },
  { id: 'mood-13', rating: 3, note: null, date: '2026-05-19' },
  { id: 'mood-14', rating: 4, note: null, date: '2026-05-18' },
];

export const mockMoodStats = {
  monthlyAverage: 3.5,
  highest: 5,
  lowest: 1,
  positiveDays: 12,
  lowDays: 3,
  streakDays: 5,
};
