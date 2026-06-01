export interface MockActivity {
  id: string;
  name: string;
  category: string;
  type: string;
  points: number;
  startDate: string;
  result: string | null;
}

export const mockActivities: MockActivity[] = [
  { id: 'a1', name: '加入机器人社团', category: '社团', type: 'ACTIVITY', points: 50, startDate: '2026-05-15', result: '正式成员' },
  { id: 'a2', name: '英语演讲比赛', category: '比赛', type: 'COMPETITION', points: 100, startDate: '2026-05-28', result: '一等奖' },
  { id: 'a3', name: '心理健康讲座', category: '讲座', type: 'PSYCHOLOGY', points: 30, startDate: '2026-04-10', result: null },
  { id: 'a4', name: '数学竞赛培训', category: '培训', type: 'ACADEMIC', points: 40, startDate: '2026-03-20', result: '完成' },
  { id: 'a5', name: '个人阅读计划', category: '个人', type: 'PERSONAL', points: 20, startDate: '2026-02-15', result: null },
];
