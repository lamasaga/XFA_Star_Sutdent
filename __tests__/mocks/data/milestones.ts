export interface MockMilestone {
  id: string;
  title: string;
  type: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  occurredAt: string;
  points: number;
}

export const mockMilestones: MockMilestone[] = [
  { id: 'ms-1', title: '英语演讲比赛一等奖', type: 'COMPETITION', status: 'APPROVED', occurredAt: '2026-05-28', points: 100 },
  { id: 'ms-2', title: '期中考试班级第5名', type: 'ACADEMIC', status: 'APPROVED', occurredAt: '2026-05-25', points: 50 },
  { id: 'ms-3', title: '数学竞赛报名', type: 'COMPETITION', status: 'PENDING', occurredAt: '2026-06-01', points: 30 },
  { id: 'ms-4', title: '科技创新大赛三等奖', type: 'COMPETITION', status: 'APPROVED', occurredAt: '2026-04-15', points: 80 },
  { id: 'ms-5', title: '志愿服务20小时', type: 'ACTIVITY', status: 'APPROVED', occurredAt: '2026-03-20', points: 40 },
  { id: 'ms-6', title: '校级三好学生', type: 'PERSONAL', status: 'APPROVED', occurredAt: '2026-02-28', points: 60 },
];
