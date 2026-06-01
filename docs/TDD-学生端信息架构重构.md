# 新府学「一生一案」学生端信息架构重构 — TDD 测试驱动开发文档

> **文档定位**：基于 BDD `docs/BDD-学生端信息架构重构.md`，提供可执行的测试文件路径、代码骨架和运行命令。每个测试对应一个 BDD Scenario，确保重构可验证、可回归。  
> **读者**：前端工程师、测试工程师  
> **技术栈**：Vitest（单元/集成）+ React Testing Library + MSW（API Mock）+ Playwright（E2E）  
> **最后更新**：2026-06-01

---

## 一、测试架构

### 1.1 测试分层

| 层级 | 工具 | 用途 | 运行速度 | 文件位置 |
|------|------|------|----------|----------|
| **单元测试** | Vitest | 纯函数、工具类、状态计算 | 毫秒级 | `__tests__/unit/**/*.test.ts` |
| **组件测试** | Vitest + RTL + jsdom | React 组件渲染与交互 | 秒级 | `__tests__/components/**/*.test.tsx` |
| **API 测试** | Vitest + MSW | 后端路由、聚合接口、数据格式 | 秒级 | `__tests__/api/**/*.test.ts` |
| **E2E 测试** | Playwright | 真实浏览器 + 完整用户旅程 | 分钟级 | `e2e/**/*.spec.ts` |

### 1.2 测试工具安装

```bash
# 单元/集成测试依赖
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw

# E2E 测试依赖
npm install -D @playwright/test
npx playwright install
```

### 1.3 配置文件

**vitest.config.ts**（项目根目录）：

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', '__tests__/setup.ts', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

**__tests__/setup.ts**（测试初始化）：

```typescript
import '@testing-library/jest-dom';
import { server } from './mocks/server';

// 启动 MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**__tests__/mocks/server.ts**（MSW 服务器）：

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

**playwright.config.ts**（项目根目录）：

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**package.json 脚本补充**：

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## 二、测试目录结构

```
__tests__/
├── setup.ts                    # 测试初始化（jest-dom + MSW）
├── mocks/
│   ├── server.ts               # MSW 服务器实例
│   ├── handlers.ts             # API Mock 处理器
│   └── data/
│       ├── students.ts         # 学生数据工厂
│       ├── comments.ts         # 评语数据工厂
│       ├── milestones.ts       # 里程碑数据工厂
│       ├── activities.ts       # 活动数据工厂
│       ├── scores.ts           # 成绩数据工厂
│       ├── mood.ts             # 心情数据工厂
│       └── assessments.ts     # 测评数据工厂
├── unit/
│   └── utils/
│       └── todoGenerator.test.ts      # Feature 2: 待办生成规则
│       └── navigation.test.ts         # Feature 1: 导航工具函数
├── components/
│   ├── student-sidebar.test.tsx       # Feature 1: 侧边栏导航
│   ├── breadcrumb.test.tsx            # Feature 1: 面包屑
│   ├── student-mobile-nav.test.tsx    # Feature 1: 移动端导航
│   ├── dashboard.test.tsx             # Feature 2: Dashboard
│   ├── profile.test.tsx               # Feature 3: Profile
│   ├── mood.test.tsx                  # Feature 4: Mood
│   ├── assessments.test.tsx           # Feature 4: Assessments
│   ├── scores.test.tsx                # Feature 5: Scores
│   ├── milestones.test.tsx            # Feature 6: Milestones
│   ├── activities.test.tsx            # Feature 7: Activities
│   └── settings.test.tsx              # Feature 8: Settings
├── api/
│   ├── students.me.profile.test.ts    # Feature 10: 聚合 API
│   ├── students.me.todos.test.ts     # Feature 10: 待办 API
│   └── mood.stats.test.ts            # Feature 10: 心情统计 API
└── integration/
    └── deduplication.test.tsx         # Feature 11: 信息去重验证

e2e/
├── auth.setup.ts                      # E2E 登录状态
├── navigation.spec.ts                 # E2E: 全局导航
├── student-journey.spec.ts            # E2E: 学生一天典型流程
└── deduplication.spec.ts              # E2E: 信息去重全局验证
```

---

## 三、数据工厂（Test Factories）

### 3.1 学生数据工厂

**__tests__/mocks/data/students.ts**：

```typescript
import { faker } from '@faker-js/faker/locale/zh_CN';

export interface MockStudent {
  id: string;
  name: string;
  studentId: string;
  grade: string;
  class: string;
  enrollmentYear: string;
  graduationYear: string;
  gender: '男' | '女';
  email: string;
  level: number;
  points: number;
  fiveDimensions: Record<string, number>;
}

export const createMockStudent = (overrides?: Partial<MockStudent>): MockStudent => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  studentId: `2028${faker.number.int({ min: 1000, max: 9999 }).toString().padStart(4, '0')}`,
  grade: '高一',
  class: `${faker.number.int({ min: 1, max: 10 })}班`,
  enrollmentYear: '2025-09-01',
  graduationYear: '2028-06-30',
  gender: faker.helpers.arrayElement(['男', '女']),
  email: faker.internet.email(),
  level: faker.number.int({ min: 1, max: 10 }),
  points: faker.number.int({ min: 0, max: 1000 }),
  fiveDimensions: {
    学业: faker.number.int({ min: 60, max: 100 }),
    心理: faker.number.int({ min: 60, max: 100 }),
    职业: faker.number.int({ min: 40, max: 80 }),
    社交: faker.number.int({ min: 70, max: 100 }),
    特长: faker.number.int({ min: 50, max: 90 }),
  },
  ...overrides,
});

// 预设：张明
export const studentZhangMing: MockStudent = createMockStudent({
  name: '张明',
  studentId: '20280101',
  grade: '高一',
  class: '1班',
  gender: '女',
  level: 5,
  points: 320,
  fiveDimensions: {
    学业: 85,
    心理: 72,
    职业: 60,
    社交: 88,
    特长: 70,
  },
});
```

### 3.2 评语数据工厂

**__tests__/mocks/data/comments.ts**：

```typescript
import { faker } from '@faker-js/faker/locale/zh_CN';

export interface MockComment {
  id: string;
  content: string;
  teacherName: string;
  createdAt: string;
}

export const createMockComments = (count: number): MockComment[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `comment-${i + 1}`,
    content: faker.lorem.sentence(10),
    teacherName: faker.helpers.arrayElement(['李老师', '王老师', '张老师', '陈老师']),
    createdAt: faker.date.recent({ days: 30 + i * 5 }).toISOString(),
  }));
};

export const mockComments12 = createMockComments(12);
```

### 3.3 里程碑数据工厂

**__tests__/mocks/data/milestones.ts**：

```typescript
export interface MockMilestone {
  id: string;
  title: string;
  type: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  occurredAt: string;
  createdAt: string;
}

export const createMockMilestones = (): MockMilestone[] => [
  { id: 'ms-1', title: '英语演讲比赛一等奖', type: 'COMPETITION', status: 'APPROVED', occurredAt: '2026-05-28', createdAt: '2026-05-28' },
  { id: 'ms-2', title: '期中考试班级第5名', type: 'ACADEMIC', status: 'APPROVED', occurredAt: '2026-05-25', createdAt: '2026-05-25' },
  { id: 'ms-3', title: '数学竞赛报名', type: 'COMPETITION', status: 'PENDING', occurredAt: '2026-06-01', createdAt: '2026-06-01' },
  { id: 'ms-4', title: '科技创新大赛三等奖', type: 'COMPETITION', status: 'APPROVED', occurredAt: '2026-04-15', createdAt: '2026-04-15' },
  { id: 'ms-5', title: '志愿服务20小时', type: 'ACTIVITY', status: 'APPROVED', occurredAt: '2026-03-20', createdAt: '2026-03-20' },
  { id: 'ms-6', title: '校级三好学生', type: 'PERSONAL', status: 'APPROVED', occurredAt: '2026-02-28', createdAt: '2026-02-28' },
  { id: 'ms-7', title: '作文比赛二等奖', type: 'COMPETITION', status: 'APPROVED', occurredAt: '2026-01-15', createdAt: '2026-01-15' },
  { id: 'ms-8', title: '班级干部竞选', type: 'GROWTH', status: 'REJECTED', occurredAt: '2025-12-01', createdAt: '2025-12-01' },
];
```

### 3.4 心情数据工厂

**__tests__/mocks/data/mood.ts**：

```typescript
export interface MockMoodEntry {
  id: string;
  rating: number;
  note: string | null;
  date: string;
}

export const createMockMoodEntries = (days: number): MockMoodEntry[] => {
  const entries: MockMoodEntry[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    // 模拟连续记录
    if (i < 5) {
      entries.push({
        id: `mood-${i}`,
        rating: [3, 4, 5, 4, 3][i],
        note: i === 0 ? '今天感觉不错' : null,
        date: date.toISOString().split('T')[0],
      });
    }
  }
  return entries;
};

export const mockMoodEntries15 = createMockMoodEntries(15);

export const mockMoodStats = {
  monthlyAverage: 3.5,
  highest: 5,
  lowest: 1,
  positiveDays: 12,
  lowDays: 3,
  streakDays: 5,
};
```

### 3.5 成绩数据工厂

**__tests__/mocks/data/scores.ts**：

```typescript
export interface MockScore {
  id: string;
  subject: string;
  score: number;
  fullScore: number;
  scoreRate: number;
  examName: string;
  semester: string;
  date: string;
}

export const mockScores: MockScore[] = [
  { id: 's1', subject: '语文', score: 88, fullScore: 100, scoreRate: 0.88, examName: '期中考试', semester: '2025-2026-2', date: '2026-05-25' },
  { id: 's2', subject: '数学', score: 95, fullScore: 100, scoreRate: 0.95, examName: '期中考试', semester: '2025-2026-2', date: '2026-05-25' },
  { id: 's3', subject: '英语', score: 92, fullScore: 100, scoreRate: 0.92, examName: '期中考试', semester: '2025-2026-2', date: '2026-05-25' },
  { id: 's4', subject: '物理', score: 85, fullScore: 100, scoreRate: 0.85, examName: '月考', semester: '2025-2026-2', date: '2026-04-20' },
  { id: 's5', subject: '化学', score: 78, fullScore: 100, scoreRate: 0.78, examName: '月考', semester: '2025-2026-2', date: '2026-04-20' },
];
```

### 3.6 活动数据工厂

**__tests__/mocks/data/activities.ts**：

```typescript
export interface MockActivity {
  id: string;
  title: string;
  type: string;
  points: number;
  date: string;
}

export const mockActivities: MockActivity[] = [
  { id: 'a1', title: '加入机器人社团', type: 'ACTIVITY', points: 50, date: '2026-05-15' },
  { id: 'a2', title: '英语演讲比赛', type: 'COMPETITION', points: 100, date: '2026-05-28' },
  { id: 'a3', title: '心理健康讲座', type: 'PSYCHOLOGY', points: 30, date: '2026-04-10' },
  { id: 'a4', title: '数学竞赛培训', type: 'ACADEMIC', points: 40, date: '2026-03-20' },
  { id: 'a5', title: '个人阅读计划', type: 'PERSONAL', points: 20, date: '2026-02-15' },
];
```

### 3.7 聚合档案 API 响应工厂

**__tests__/mocks/data/profile.ts**：

```typescript
import { studentZhangMing } from './students';
import { mockComments12 } from './comments';
import { createMockMilestones } from './milestones';
import { mockActivities } from './activities';
import { mockScores } from './scores';

export const mockProfileResponse = {
  student: studentZhangMing,
  fiveDimensions: studentZhangMing.fiveDimensions,
  comments: mockComments12,
  milestones: createMockMilestones(),
  activities: mockActivities,
  scoreSummary: {
    totalExams: 24,
    averageScoreRate: 0.86,
    subjects: [...new Set(mockScores.map(s => s.subject))],
  },
};
```

---

## 四、MSW Mock Handlers

**__tests__/mocks/handlers.ts**：

```typescript
import { http, HttpResponse } from 'msw';
import { studentZhangMing } from './data/students';
import { mockProfileResponse } from './data/profile';
import { mockMoodEntries15, mockMoodStats } from './data/mood';
import { createMockMilestones } from './data/milestones';
import { mockActivities } from './data/activities';
import { mockScores } from './data/scores';
import { mockComments12 } from './data/comments';

export const handlers = [
  // 学生基本信息
  http.get('/api/students/me', () => {
    return HttpResponse.json({ student: studentZhangMing });
  }),

  // 聚合档案 API
  http.get('/api/students/me/profile', () => {
    return HttpResponse.json(mockProfileResponse);
  }),

  // 今日待办 API
  http.get('/api/students/me/todos', () => {
    return HttpResponse.json({
      todos: [
        { id: 'mood', text: '记录今日心情', priority: 'high', completed: false },
        { id: 'assessment', text: '完成五维自评（本周未打卡）', priority: 'medium', completed: false },
      ],
    });
  }),

  // 心情记录
  http.get('/api/mood', () => {
    return HttpResponse.json({ entries: mockMoodEntries15 });
  }),

  http.post('/api/mood', async ({ request }) => {
    const body = await request.json() as { rating: number; note?: string };
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
    return HttpResponse.json({ milestones: createMockMilestones() });
  }),

  http.post('/api/milestones', async ({ request }) => {
    const body = await request.json();
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
```

---

## 五、Feature 测试文件与代码骨架

### Feature 1: 全局导航与面包屑

#### 测试文件 1: `__tests__/components/student-sidebar.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudentSidebar } from '@/components/student-sidebar';
import { usePathname } from 'next/navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

const NAV_ITEMS = [
  { label: '今日工作台', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: '成长档案', href: '/profile', icon: 'User' },
  { label: '学业成绩', href: '/scores', icon: 'BarChart3' },
  { label: '心理测评', href: '/assessments', icon: 'Brain' },
  { label: '心情日记', href: '/mood', icon: 'Heart' },
  { label: '里程碑', href: '/milestones', icon: 'Trophy' },
  { label: '活动记录', href: '/activities', icon: 'Target' },
  { label: '学期报告', href: '/semester-reports', icon: 'FileText' },
];

describe('Feature 1: 全局导航与面包屑', () => {
  describe('场景 1.1: 侧边栏导航在所有学生端页面可见', () => {
    it.each([
      '/dashboard', '/profile', '/scores', '/assessments',
      '/mood', '/milestones', '/activities', '/semester-reports', '/settings',
    ])('在 %s 页面应显示侧边栏', (pathname) => {
      vi.mocked(usePathname).mockReturnValue(pathname);
      render(<StudentSidebar user={mockUser} />);
      
      // 验证侧边栏存在
      const sidebar = screen.getByRole('navigation', { name: /主导航/i });
      expect(sidebar).toBeInTheDocument();
      
      // 验证宽度
      expect(sidebar).toHaveStyle({ width: '240px' });
      
      // 验证所有导航项存在
      NAV_ITEMS.forEach(item => {
        expect(screen.getByText(item.label)).toBeInTheDocument();
      });
      
      // 验证底部区域
      expect(screen.getByText('设置')).toBeInTheDocument();
      expect(screen.getByText('退出登录')).toBeInTheDocument();
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    });
  });

  describe('场景 1.2: 当前页面在导航中高亮', () => {
    it('在 /scores 页面"学业成绩"应高亮', () => {
      vi.mocked(usePathname).mockReturnValue('/scores');
      render(<StudentSidebar user={mockUser} />);
      
      const scoresNav = screen.getByText('学业成绩').closest('a');
      expect(scoresNav).toHaveClass('bg-[#f0f9ff]', 'border-l-[3px]', 'border-l-blue-500');
      
      // 其他导航项不高亮
      const profileNav = screen.getByText('成长档案').closest('a');
      expect(profileNav).not.toHaveClass('bg-[#f0f9ff]');
    });
  });

  describe('场景 1.3: 点击导航项跳转到对应页面', () => {
    it('点击"成长档案"应导航到 /profile', () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard');
      render(<StudentSidebar user={mockUser} />);
      
      const profileLink = screen.getByText('成长档案').closest('a');
      expect(profileLink).toHaveAttribute('href', '/profile');
    });
  });

  describe('场景 1.12: 侧边栏用户信息卡片显示正确', () => {
    it('应显示用户姓名、班级、等级和积分', () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard');
      render(<StudentSidebar user={mockUser} />);
      
      expect(screen.getByText('张明')).toBeInTheDocument();
      expect(screen.getByText(/高一.*1班/)).toBeInTheDocument();
      expect(screen.getByText(/Lv\.5.*320积分/)).toBeInTheDocument();
    });
  });
});
```

#### 测试文件 2: `__tests__/components/breadcrumb.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Breadcrumb } from '@/components/breadcrumb';

describe('Feature 1: 面包屑导航', () => {
  describe('场景 1.7: 面包屑显示页面层级', () => {
    it('在 /scores 页面应显示"首页 > 学业成绩"', () => {
      render(<Breadcrumb items={[{ label: '首页', href: '/' }, { label: '学业成绩' }]} />);
      expect(screen.getByText('首页')).toBeInTheDocument();
      expect(screen.getByText('学业成绩')).toBeInTheDocument();
      expect(screen.getByText('首页').closest('a')).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('场景 1.8: Dashboard 不显示面包屑', () => {
    it('在 /dashboard 页面不应显示面包屑', () => {
      const { container } = render(<Breadcrumb items={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });
});
```

#### 测试文件 3: `__tests__/components/student-mobile-nav.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StudentMobileNav } from '@/components/student-mobile-nav';
import { usePathname } from 'next/navigation';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

describe('Feature 1: 移动端导航', () => {
  beforeEach(() => {
    // 模拟移动端视口
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
    window.dispatchEvent(new Event('resize'));
  });

  describe('场景 1.5: 移动端汉堡菜单打开导航抽屉', () => {
    it('点击汉堡菜单应滑出抽屉', async () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard');
      render(<StudentMobileNav user={mockUser} />);
      
      // 验证汉堡菜单按钮
      const menuButton = screen.getByRole('button', { name: /菜单/i });
      expect(menuButton).toBeInTheDocument();
      
      // 点击打开抽屉
      fireEvent.click(menuButton);
      
      // 验证抽屉内容
      await waitFor(() => {
        expect(screen.getByText('今日工作台')).toBeInTheDocument();
        expect(screen.getByText('成长档案')).toBeInTheDocument();
        expect(screen.getByText('张明')).toBeInTheDocument();
      });
    });
  });

  describe('场景 1.6: 移动端底部 Tab 导航可见且可点击', () => {
    it('应显示底部 Tab 栏', () => {
      vi.mocked(usePathname).mockReturnValue('/dashboard');
      render(<StudentMobileNav user={mockUser} />);
      
      expect(screen.getByRole('tab', { name: /首页/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /档案/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /成绩/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /更多/i })).toBeInTheDocument();
    });
  });
});
```

---

### Feature 2: Dashboard — 今日工作台

#### 测试文件 4: `__tests__/unit/utils/todoGenerator.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { generateTodos } from '@/lib/todo-generator';

describe('Feature 2: Dashboard 待办生成规则', () => {
  describe('场景 2.5: 今日待办自动生成规则', () => {
    it('未记录心情 + 未自评 → 应生成 2 条待办', () => {
      const todos = generateTodos({
        todayMood: null,
        weekAssessment: null,
        upcomingExam: null,
      });
      
      expect(todos).toHaveLength(2);
      expect(todos[0]).toEqual({
        id: 'mood',
        text: '记录今日心情',
        priority: 'high',
        completed: false,
      });
      expect(todos[1]).toEqual({
        id: 'assessment',
        text: '完成五维自评（本周未打卡）',
        priority: 'medium',
        completed: false,
      });
    });

    it('已记录心情 + 有 3 天内考试 → 应生成 1 条考试提醒', () => {
      const todos = generateTodos({
        todayMood: { rating: 4, date: '2026-06-01' },
        weekAssessment: { completedAt: '2026-05-30' },
        upcomingExam: { subject: '英语', date: '2026-06-03' },
      });
      
      expect(todos).toHaveLength(1);
      expect(todos[0]).toMatchObject({
        id: 'exam',
        text: '英语月考复习提醒',
        priority: 'medium',
      });
    });

    it('所有条件已完成 → 应返回空数组', () => {
      const todos = generateTodos({
        todayMood: { rating: 4, date: '2026-06-01' },
        weekAssessment: { completedAt: '2026-05-30' },
        upcomingExam: null,
      });
      
      expect(todos).toHaveLength(0);
    });

    it('待办应按优先级排序', () => {
      const todos = generateTodos({
        todayMood: null,
        weekAssessment: null,
        upcomingExam: { subject: '数学', date: '2026-06-02' },
      });
      
      expect(todos[0].priority).toBe('high');
      expect(todos[1].priority).toBe('medium');
      expect(todos[2].priority).toBe('medium');
    });
  });
});
```

#### 测试文件 5: `__tests__/components/dashboard.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardPage } from '@/app/(student)/dashboard/page';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { studentId: '20280101', name: '张明' } }, status: 'authenticated' }),
}));

describe('Feature 2: Dashboard — 今日工作台', () => {
  describe('场景 2.1: Dashboard 不显示五维雷达', () => {
    it('不应包含 RadarChart 组件', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument();
        expect(screen.queryByText(/五维成长/)).not.toBeInTheDocument();
      });
    });
  });

  describe('场景 2.2: Dashboard 不显示成绩趋势图', () => {
    it('不应包含 LineChart 组件', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.queryByTestId('score-trend-chart')).not.toBeInTheDocument();
        expect(screen.queryByText(/成绩趋势/)).not.toBeInTheDocument();
      });
    });
  });

  describe('场景 2.3: Dashboard 不显示完整评语列表', () => {
    it('不应显示超过 1 条教师评语', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        const commentElements = screen.queryAllByTestId('teacher-comment');
        expect(commentElements.length).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('场景 2.4: Dashboard 显示今日待办列表', () => {
    it('应显示待办事项', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText(/今日待办/)).toBeInTheDocument();
        expect(screen.getByText('记录今日心情')).toBeInTheDocument();
        expect(screen.getByText('完成五维自评（本周未打卡）')).toBeInTheDocument();
      });
    });
  });

  describe('场景 2.6: Dashboard 显示今日心情打卡', () => {
    it('应显示 5 个心情选项', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('很低落')).toBeInTheDocument();
        expect(screen.getByText('有些低落')).toBeInTheDocument();
        expect(screen.getByText('一般')).toBeInTheDocument();
        expect(screen.getByText('不错')).toBeInTheDocument();
        expect(screen.getByText('非常好')).toBeInTheDocument();
      });
    });
  });

  describe('场景 2.7: Dashboard 显示本周打卡进度', () => {
    it('应显示打卡进度卡片', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText(/本周打卡进度/)).toBeInTheDocument();
        expect(screen.getByText(/心情日记/)).toBeInTheDocument();
        expect(screen.getByText(/五维自评/)).toBeInTheDocument();
        expect(screen.getByText(/里程碑/)).toBeInTheDocument();
      });
    });
  });

  describe('场景 2.8: Dashboard 显示最新动态摘要', () => {
    it('应显示最新 3 条动态', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText(/最新动态/)).toBeInTheDocument();
        expect(screen.getByText(/查看全部/)).toBeInTheDocument();
      });
    });
  });

  describe('场景 2.9: Dashboard 显示快捷入口网格', () => {
    it('应显示 4 个快捷入口卡片', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText(/快捷入口/)).toBeInTheDocument();
        expect(screen.getByText('心理测评')).toBeInTheDocument();
        expect(screen.getByText('记录心情')).toBeInTheDocument();
        expect(screen.getByText('里程碑')).toBeInTheDocument();
        expect(screen.getByText('活动记录')).toBeInTheDocument();
      });
    });
  });
});
```

---

### Feature 3: Profile — 成长档案总览

#### 测试文件 6: `__tests__/components/profile.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProfilePage } from '@/app/(student)/profile/page';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { studentId: '20280101', name: '张明' } }, status: 'authenticated' }),
}));

describe('Feature 3: Profile — 成长档案总览', () => {
  describe('场景 3.1: Profile 显示完整五维成长雷达', () => {
    it('应显示 RadarChart 和维度分数', async () => {
      render(<ProfilePage />);
      await waitFor(() => {
        expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
        expect(screen.getByText('学业')).toBeInTheDocument();
        expect(screen.getByText('85')).toBeInTheDocument();
        expect(screen.getByText('社交')).toBeInTheDocument();
        expect(screen.getByText('88')).toBeInTheDocument();
      });
    });
  });

  describe('场景 3.2: Profile 不显示今日待办', () => {
    it('不应包含待办列表', async () => {
      render(<ProfilePage />);
      await waitFor(() => {
        expect(screen.queryByText(/今日待办/)).not.toBeInTheDocument();
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('场景 3.3: Profile 不显示心情打卡', () => {
    it('不应包含心情选项按钮', async () => {
      render(<ProfilePage />);
      await waitFor(() => {
        expect(screen.queryByText('很低落')).not.toBeInTheDocument();
        expect(screen.queryByText('有些低落')).not.toBeInTheDocument();
        expect(screen.queryByText('一般')).not.toBeInTheDocument();
        expect(screen.queryByText('不错')).not.toBeInTheDocument();
        expect(screen.queryByText('非常好')).not.toBeInTheDocument();
      });
    });
  });

  describe('场景 3.4: Profile 显示成长时间线', () => {
    it('应显示时间线并按类型筛选', async () => {
      render(<ProfilePage />);
      await waitFor(() => {
        expect(screen.getByText(/成长时间线/)).toBeInTheDocument();
        expect(screen.getByText('全部')).toBeInTheDocument();
        expect(screen.getByText('成绩')).toBeInTheDocument();
        expect(screen.getByText('评语')).toBeInTheDocument();
        expect(screen.getByText('里程碑')).toBeInTheDocument();
        expect(screen.getByText('活动')).toBeInTheDocument();
      });
    });
  });

  describe('场景 3.5: Profile 显示全部教师评语', () => {
    it('应显示多条评语', async () => {
      render(<ProfilePage />);
      await waitFor(() => {
        const comments = screen.queryAllByTestId('teacher-comment-full');
        expect(comments.length).toBeGreaterThan(2);
      });
    });
  });

  describe('场景 3.8: Profile 底部显示综合统计', () => {
    it('应显示综合统计行', async () => {
      render(<ProfilePage />);
      await waitFor(() => {
        expect(screen.getByText(/综合统计/)).toBeInTheDocument();
        expect(screen.getByText(/考试记录/)).toBeInTheDocument();
        expect(screen.getByText(/教师评语/)).toBeInTheDocument();
        expect(screen.getByText(/里程碑/)).toBeInTheDocument();
        expect(screen.getByText(/活动积分/)).toBeInTheDocument();
        expect(screen.getByText(/心情记录/)).toBeInTheDocument();
        expect(screen.getByText(/测评/)).toBeInTheDocument();
      });
    });
  });

  describe('场景 3.9: Profile 页面使用聚合 API', () => {
    it('应只调用 /api/students/me/profile', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      render(<ProfilePage />);
      
      await waitFor(() => {
        const profileCall = fetchSpy.mock.calls.find(call => 
          call[0].toString().includes('/api/students/me/profile')
        );
        expect(profileCall).toBeDefined();
        
        // 不应调用独立接口
        expect(fetchSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('/api/comments'),
          expect.anything()
        );
      });
      
      fetchSpy.mockRestore();
    });
  });
});
```

---

### Feature 4: Space 拆分 — Mood + Assessments

#### 测试文件 7: `__tests__/components/mood.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MoodPage } from '@/app/(student)/mood/page';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { studentId: '20280101', name: '张明' } }, status: 'authenticated' }),
}));

describe('Feature 4: Mood — 心情日记', () => {
  describe('场景 4.2: Mood 页面不显示心理测评', () => {
    it('不应包含量表列表或 AssessmentPlayer', async () => {
      render(<MoodPage />);
      await waitFor(() => {
        expect(screen.queryByText(/心理测评/)).not.toBeInTheDocument();
        expect(screen.queryByTestId('assessment-player')).not.toBeInTheDocument();
      });
    });
  });

  describe('场景 4.3: Mood 页面显示今日心情记录', () => {
    it('应显示 5 个心情选项', async () => {
      render(<MoodPage />);
      await waitFor(() => {
        expect(screen.getByText('很低落')).toBeInTheDocument();
        expect(screen.getByText('有些低落')).toBeInTheDocument();
        expect(screen.getByText('一般')).toBeInTheDocument();
        expect(screen.getByText('不错')).toBeInTheDocument();
        expect(screen.getByText('非常好')).toBeInTheDocument();
      });
    });
  });

  describe('场景 4.4: Mood 页面显示心情日历热力图', () => {
    it('应显示日历组件', async () => {
      render(<MoodPage />);
      await waitFor(() => {
        expect(screen.getByText(/心情日历/)).toBeInTheDocument();
        expect(screen.getByTestId('mood-calendar')).toBeInTheDocument();
      });
    });
  });

  describe('场景 4.5: Mood 页面显示近 30 天心情趋势', () => {
    it('应显示折线图', async () => {
      render(<MoodPage />);
      await waitFor(() => {
        expect(screen.getByText(/近 30 天心情趋势/)).toBeInTheDocument();
        expect(screen.getByTestId('mood-trend-chart')).toBeInTheDocument();
      });
    });
  });

  describe('场景 4.6: Mood 页面显示心情统计', () => {
    it('应显示统计数字', async () => {
      render(<MoodPage />);
      await waitFor(() => {
        expect(screen.getByText(/心情统计/)).toBeInTheDocument();
        expect(screen.getByText(/本月平均/)).toBeInTheDocument();
        expect(screen.getByText(/连续记录/)).toBeInTheDocument();
      });
    });
  });
});
```

#### 测试文件 8: `__tests__/components/assessments.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AssessmentsPage } from '@/app/(student)/assessments/page';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { studentId: '20280101', name: '张明' } }, status: 'authenticated' }),
}));

describe('Feature 4: Assessments — 心理测评', () => {
  describe('场景 4.7: Assessments 页面不显示心情记录', () => {
    it('不应包含心情选项按钮', async () => {
      render(<AssessmentsPage />);
      await waitFor(() => {
        expect(screen.queryByText('很低落')).not.toBeInTheDocument();
        expect(screen.queryByText('今日心情')).not.toBeInTheDocument();
      });
    });
  });

  describe('场景 4.8: Assessments 页面只显示测评相关功能', () => {
    it('应显示量表列表', async () => {
      render(<AssessmentsPage />);
      await waitFor(() => {
        expect(screen.getByText(/测评概览/)).toBeInTheDocument();
        expect(screen.getByText(/历史测评结果/)).toBeInTheDocument();
      });
    });
  });
});
```

---

### Feature 5~7: Scores / Milestones / Activities

#### 测试文件 9: `__tests__/components/scores.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ScoresPage } from '@/app/(student)/scores/page';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { studentId: '20280101', name: '张明' } }, status: 'authenticated' }),
}));

describe('Feature 5: Scores — 学业成绩', () => {
  describe('场景 5.1: 统计卡片精简', () => {
    it('只显示考试科目数和平均得分率', async () => {
      render(<ScoresPage />);
      await waitFor(() => {
        expect(screen.getByText(/考试科目数/)).toBeInTheDocument();
        expect(screen.getByText(/平均得分率/)).toBeInTheDocument();
        expect(screen.queryByText(/最高分/)).not.toBeInTheDocument();
        expect(screen.queryByText(/考试记录数/)).not.toBeInTheDocument();
      });
    });
  });

  describe('场景 5.4: 成绩明细表支持学期筛选', () => {
    it('应有学期筛选下拉框', async () => {
      render(<ScoresPage />);
      await waitFor(() => {
        expect(screen.getByLabelText(/学期筛选/i)).toBeInTheDocument();
      });
    });
  });
});
```

#### 测试文件 10: `__tests__/components/milestones.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MilestonesPage } from '@/app/(student)/milestones/page';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { studentId: '20280101', name: '张明' } }, status: 'authenticated' }),
}));

describe('Feature 6: Milestones — 里程碑', () => {
  describe('场景 6.1: 显示状态筛选 Tab', () => {
    it('应显示全部/已通过/待审核/已拒绝 Tab', async () => {
      render(<MilestonesPage />);
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /全部/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /已通过/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /待审核/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /已拒绝/i })).toBeInTheDocument();
      });
    });

    it('点击已通过应只显示 APPROVED 里程碑', async () => {
      render(<MilestonesPage />);
      await waitFor(async () => {
        const approvedTab = screen.getByRole('tab', { name: /已通过/i });
        fireEvent.click(approvedTab);
        
        const pendingItems = screen.queryAllByText(/待审核/);
        expect(pendingItems).toHaveLength(0);
      });
    });
  });
});
```

#### 测试文件 11: `__tests__/components/activities.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ActivitiesPage } from '@/app/(student)/activities/page';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { studentId: '20280101', name: '张明' } }, status: 'authenticated' }),
}));

describe('Feature 7: Activities — 活动记录', () => {
  describe('场景 7.1: 显示分类筛选 Tab', () => {
    it('应显示分类筛选 Tab', async () => {
      render(<ActivitiesPage />);
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /全部/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /比赛/i })).toBeInTheDocument();
      });
    });
  });
});
```

---

### Feature 8: Settings — 个人设置

#### 测试文件 12: `__tests__/components/settings.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SettingsPage } from '@/app/(student)/settings/page';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { studentId: '20280101', name: '张明', email: 'zhangming@example.com' } }, status: 'authenticated' }),
}));

describe('Feature 8: Settings — 个人设置', () => {
  describe('场景 8.2: 显示账号信息', () => {
    it('应显示只读字段和可编辑字段', async () => {
      render(<SettingsPage />);
      await waitFor(() => {
        expect(screen.getByText(/账号信息/)).toBeInTheDocument();
        expect(screen.getByDisplayValue('张明')).toBeDisabled();
        expect(screen.getByDisplayValue('20280101')).toBeDisabled();
        expect(screen.getByDisplayValue('zhangming@example.com')).not.toBeDisabled();
      });
    });
  });

  describe('场景 8.3: 显示通知偏好', () => {
    it('应显示通知复选框', async () => {
      render(<SettingsPage />);
      await waitFor(() => {
        expect(screen.getByText(/通知偏好/)).toBeInTheDocument();
        expect(screen.getByLabelText(/教师新评语通知/)).toBeInTheDocument();
        expect(screen.getByLabelText(/里程碑审核结果通知/)).toBeInTheDocument();
      });
    });
  });

  describe('场景 8.4: 显示隐私设置', () => {
    it('应显示隐私复选框', async () => {
      render(<SettingsPage />);
      await waitFor(() => {
        expect(screen.getByText(/隐私设置/)).toBeInTheDocument();
        expect(screen.getByLabelText(/允许同学查看我的五维雷达/)).toBeInTheDocument();
      });
    });
  });

  describe('场景 8.5: 保存设置成功', () => {
    it('修改邮箱后应显示成功提示', async () => {
      render(<SettingsPage />);
      await waitFor(() => {
        const emailInput = screen.getByDisplayValue('zhangming@example.com');
        fireEvent.change(emailInput, { target: { value: 'zhangming-new@example.com' } });
        
        const saveButton = screen.getByText(/保存设置/);
        fireEvent.click(saveButton);
        
        expect(screen.getByText(/保存成功/)).toBeInTheDocument();
      });
    });
  });
});
```

---

### Feature 10: API 数据流与聚合接口

#### 测试文件 13: `__tests__/api/students.me.profile.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/students/me/profile/route';
import { mockProfileResponse } from '../mocks/data/profile';

describe('Feature 10: API 数据流与聚合接口', () => {
  describe('场景 10.1: Profile 使用聚合 API', () => {
    it('GET /api/students/me/profile 应返回完整档案数据', async () => {
      const response = await GET();
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('student');
      expect(data).toHaveProperty('fiveDimensions');
      expect(data).toHaveProperty('comments');
      expect(data).toHaveProperty('milestones');
      expect(data).toHaveProperty('activities');
      expect(data).toHaveProperty('scoreSummary');
      
      expect(data.comments).toHaveLength(12);
      expect(data.milestones).toHaveLength(8);
      expect(data.fiveDimensions).toEqual({
        学业: 85,
        心理: 72,
        职业: 60,
        社交: 88,
        特长: 70,
      });
    });
  });

  describe('场景 10.5: 聚合 API 响应时间小于 2 秒', () => {
    it('应在 2000ms 内响应', async () => {
      const start = Date.now();
      await GET();
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000);
    });
  });
});
```

#### 测试文件 14: `__tests__/api/students.me.todos.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/students/me/todos/route';

describe('Feature 10: 今日待办 API', () => {
  describe('场景 10.3: 今日待办 API 返回正确数据', () => {
    it('GET /api/students/me/todos 应返回待办列表', async () => {
      const response = await GET();
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('todos');
      expect(data.todos).toBeInstanceOf(Array);
      
      if (data.todos.length > 0) {
        expect(data.todos[0]).toHaveProperty('id');
        expect(data.todos[0]).toHaveProperty('text');
        expect(data.todos[0]).toHaveProperty('priority');
        expect(data.todos[0]).toHaveProperty('completed');
      }
    });
  });
});
```

#### 测试文件 15: `__tests__/api/mood.stats.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/mood/stats/route';

describe('Feature 10: 心情统计 API', () => {
  describe('场景 10.4: 心情统计 API 返回正确数据', () => {
    it('GET /api/mood/stats 应返回统计字段', async () => {
      const response = await GET();
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('monthlyAverage');
      expect(data).toHaveProperty('highest');
      expect(data).toHaveProperty('lowest');
      expect(data).toHaveProperty('positiveDays');
      expect(data).toHaveProperty('lowDays');
      expect(data).toHaveProperty('streakDays');
    });
  });
});
```

---

### Feature 11: 信息去重验证

#### 测试文件 16: `__tests__/integration/deduplication.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DashboardPage } from '@/app/(student)/dashboard/page';
import { ProfilePage } from '@/app/(student)/profile/page';
import { MoodPage } from '@/app/(student)/mood/page';
import { AssessmentsPage } from '@/app/(student)/assessments/page';
import { ScoresPage } from '@/app/(student)/scores/page';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { studentId: '20280101', name: '张明' } }, status: 'authenticated' }),
}));

describe('Feature 11: 信息去重验证（全局）', () => {
  describe('场景 11.1: 五维雷达只出现在 Profile', () => {
    it('Dashboard 不应包含 RadarChart', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument();
      });
    });

    it('Profile 应包含 RadarChart', async () => {
      render(<ProfilePage />);
      await waitFor(() => {
        expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
      });
    });

    it('Mood 不应包含 RadarChart', async () => {
      render(<MoodPage />);
      await waitFor(() => {
        expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument();
      });
    });

    it('Assessments 不应包含 RadarChart', async () => {
      render(<AssessmentsPage />);
      await waitFor(() => {
        expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument();
      });
    });

    it('Scores 不应包含 RadarChart', async () => {
      render(<ScoresPage />);
      await waitFor(() => {
        expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument();
      });
    });
  });

  describe('场景 11.4: 心情记录功能只出现在 Dashboard 和 Mood', () => {
    it('Dashboard 应包含心情选项', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText('很低落')).toBeInTheDocument();
      });
    });

    it('Mood 应包含心情选项', async () => {
      render(<MoodPage />);
      await waitFor(() => {
        expect(screen.getByText('很低落')).toBeInTheDocument();
      });
    });

    it('Profile 不应包含心情选项', async () => {
      render(<ProfilePage />);
      await waitFor(() => {
        expect(screen.queryByText('很低落')).not.toBeInTheDocument();
      });
    });

    it('Scores 不应包含心情选项', async () => {
      render(<ScoresPage />);
      await waitFor(() => {
        expect(screen.queryByText('很低落')).not.toBeInTheDocument();
      });
    });
  });

  describe('场景 11.7: 今日待办只出现在 Dashboard', () => {
    it('Dashboard 应包含今日待办', async () => {
      render(<DashboardPage />);
      await waitFor(() => {
        expect(screen.getByText(/今日待办/)).toBeInTheDocument();
      });
    });

    it('Profile 不应包含今日待办', async () => {
      render(<ProfilePage />);
      await waitFor(() => {
        expect(screen.queryByText(/今日待办/)).not.toBeInTheDocument();
      });
    });
  });
});
```

---

## 六、E2E 测试（Playwright）

### 测试文件 17: `e2e/auth.setup.ts`

```typescript
import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/student.json';

setup('authenticate as student', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="studentId"]', '20280101');
  await page.fill('input[name="password"]', 'test-password');
  await page.click('button[type="submit"]');
  
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: authFile });
});
```

### 测试文件 18: `e2e/navigation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/student.json' });

test.describe('E2E: 全局导航', () => {
  test('侧边栏导航在所有页面可见', async ({ page }) => {
    const pages = [
      '/dashboard', '/profile', '/scores', '/assessments',
      '/mood', '/milestones', '/activities', '/semester-reports', '/settings',
    ];
    
    for (const url of pages) {
      await page.goto(url);
      await expect(page.locator('nav[aria-label="主导航"]')).toBeVisible();
      await expect(page.locator('nav')).toHaveCSS('width', '240px');
    }
  });

  test('当前页面在导航中高亮', async ({ page }) => {
    await page.goto('/scores');
    const scoresNav = page.locator('nav a:has-text("学业成绩")');
    await expect(scoresNav).toHaveCSS('background-color', 'rgb(240, 249, 255)');
    await expect(scoresNav).toHaveCSS('border-left-width', '3px');
  });

  test('移动端汉堡菜单打开抽屉', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    await page.click('button[aria-label="菜单"]');
    await expect(page.locator('[data-testid="nav-drawer"]')).toBeVisible();
    
    await page.click('[data-testid="drawer-overlay"]');
    await expect(page.locator('[data-testid="nav-drawer"]')).not.toBeVisible();
  });
});
```

### 测试文件 19: `e2e/student-journey.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/student.json' });

test.describe('E2E: 学生一天典型流程', () => {
  test('张明登录后查看待办并记录心情', async ({ page }) => {
    // 打开 Dashboard
    await page.goto('/dashboard');
    await expect(page.locator('h1')).toContainText('今日工作台');
    
    // 验证待办
    await expect(page.locator('text=记录今日心情')).toBeVisible();
    
    // 记录心情
    await page.click('button:has-text("不错")');
    await page.fill('textarea[placeholder*="心情"]', '今天数学课听懂了');
    await page.click('button:has-text("记录心情")');
    
    // 验证待办完成
    await expect(page.locator('text=记录今日心情')).not.toBeVisible();
    
    // 切换到 Profile
    await page.click('nav a:has-text("成长档案")');
    await page.waitForURL('/profile');
    await expect(page.locator('h1')).toContainText('成长档案');
    
    // 切换到 Mood
    await page.click('nav a:has-text("心情日记")');
    await page.waitForURL('/mood');
    await expect(page.locator('h1')).toContainText('心情日记');
    
    // 验证日历有记录
    await expect(page.locator('[data-testid="mood-calendar"]')).toBeVisible();
  });
});
```

### 测试文件 20: `e2e/deduplication.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/student.json' });

test.describe('E2E: 信息去重全局验证', () => {
  test('五维雷达只在 Profile 出现', async ({ page }) => {
    const pagesWithoutRadar = [
      '/dashboard', '/scores', '/assessments', '/mood', 
      '/milestones', '/activities', '/semester-reports', '/settings',
    ];
    
    for (const url of pagesWithoutRadar) {
      await page.goto(url);
      await expect(page.locator('[data-testid="radar-chart"]')).not.toBeVisible();
    }
    
    await page.goto('/profile');
    await expect(page.locator('[data-testid="radar-chart"]')).toBeVisible();
  });

  test('心情记录只在 Dashboard 和 Mood', async ({ page }) => {
    // Dashboard 有心情
    await page.goto('/dashboard');
    await expect(page.locator('text=很低落')).toBeVisible();
    
    // Mood 有心情
    await page.goto('/mood');
    await expect(page.locator('text=很低落')).toBeVisible();
    
    // Profile 没有心情
    await page.goto('/profile');
    await expect(page.locator('text=很低落')).not.toBeVisible();
    
    // Scores 没有心情
    await page.goto('/scores');
    await expect(page.locator('text=很低落')).not.toBeVisible();
  });
});
```

---

## 七、运行命令速查

```bash
# 安装测试依赖
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom msw @faker-js/faker
npm install -D @playwright/test
npx playwright install

# 运行全部单元/集成测试
npm test

# 运行特定测试文件
npx vitest __tests__/components/dashboard.test.tsx

# 运行带 UI 的测试（实时查看）
npm run test:ui

# 生成覆盖率报告
npm run test:coverage

# 运行 E2E 测试
npm run test:e2e

# 运行特定 E2E 测试
npx playwright test e2e/navigation.spec.ts

# 调试 E2E（带浏览器界面）
npm run test:e2e:ui
```

---

## 八、测试实施优先级

| 优先级 | 测试文件 | 覆盖 Feature | 建议先写 |
|--------|----------|-------------|----------|
| **P0** | `todoGenerator.test.ts` | Feature 2 | ✅ 先写（纯函数，最快） |
| **P0** | `student-sidebar.test.tsx` | Feature 1 | ✅ 先写（导航是根基） |
| **P0** | `dashboard.test.tsx` | Feature 2 | ✅ 先写 |
| **P0** | `profile.test.tsx` | Feature 3 | ✅ 先写 |
| **P0** | `deduplication.test.tsx` | Feature 11 | 重构完成后写 |
| **P1** | `breadcrumb.test.tsx` | Feature 1 | 随导航一起写 |
| **P1** | `mood.test.tsx` | Feature 4 | Space 拆分时写 |
| **P1** | `assessments.test.tsx` | Feature 4 | Space 拆分时写 |
| **P1** | `scores.test.tsx` | Feature 5 | 微调整时写 |
| **P1** | `milestones.test.tsx` | Feature 6 | 加 Tab 时写 |
| **P1** | `activities.test.tsx` | Feature 7 | 加 Tab 时写 |
| **P1** | `settings.test.tsx` | Feature 8 | 新建页面时写 |
| **P1** | `students.me.profile.test.ts` | Feature 10 | 写 API 时一起写 |
| **P1** | `students.me.todos.test.ts` | Feature 10 | 写 API 时一起写 |
| **P1** | `mood.stats.test.ts` | Feature 10 | 写 API 时一起写 |
| **P2** | `student-mobile-nav.test.tsx` | Feature 1, 9 | 响应式阶段写 |
| **P2** | `navigation.spec.ts` (E2E) | Feature 1 | 导航完成后写 |
| **P2** | `student-journey.spec.ts` (E2E) | E2E-1 | 核心功能完成后写 |
| **P2** | `deduplication.spec.ts` (E2E) | E2E-2, Feature 11 | 全部重构完成后写 |

---

*新府学 BizSim Edu · 学生端信息架构重构 TDD · 2026-06-01*
