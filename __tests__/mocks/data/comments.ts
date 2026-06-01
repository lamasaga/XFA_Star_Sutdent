export interface MockComment {
  id: string;
  content: string;
  teacherName: string;
  teacherTitle: string;
  createdAt: string;
}

export const mockComments12: MockComment[] = Array.from({ length: 12 }, (_, i) => ({
  id: `comment-${i + 1}`,
  content: `教师评语内容示例 ${i + 1}：张明同学在本阶段表现${['优秀', '良好', '进步明显'][i % 3]}，${['学习态度端正', '积极参与课堂讨论', '作业完成质量高'][i % 3]}。`,
  teacherName: ['李老师', '王老师', '张老师', '陈老师'][i % 4],
  teacherTitle: ['班主任', '数学老师', '英语老师', '心理老师'][i % 4],
  createdAt: new Date(Date.now() - i * 5 * 24 * 60 * 60 * 1000).toISOString(),
}));
