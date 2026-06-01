export interface MockStudent {
  id: string;
  name: string;
  studentId: string;
  grade: string;
  class: string;
  level: number;
  points: number;
  fiveDimensions: Record<string, number>;
}

export const studentZhangMing: MockStudent = {
  id: 'stu-001',
  name: '张明',
  studentId: '20280101',
  grade: '高一',
  class: '1班',
  level: 5,
  points: 320,
  fiveDimensions: {
    学业: 85,
    心理: 72,
    职业: 60,
    社交: 88,
    特长: 70,
  },
};

export const mockUser = {
  id: 'user-001',
  name: '张明',
  email: 'zhangming@example.com',
  avatar: null,
  role: 'STUDENT',
  studentId: '20280101',
};
