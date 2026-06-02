# TDD：教师端 v1.0

> **对应 BDD**：BDD-教师端v1.0.md  
> **文档类型**：技术驱动开发（Test-Driven Development）  
> **目标**：根据 BDD 场景，确定技术实现方案、组件拆分、API 设计和测试策略

---

## 一、技术架构决策

### 1.1 前端架构

| 决策项 | 方案 | 理由 |
|--------|------|------|
| **布局方式** | 左侧固定 Sidebar + 右侧内容区 | BDD Feature 0 要求，当前缺失 |
| **导航状态** | URL 驱动（App Router） | Next.js 原生支持，无需额外状态管理 |
| **Dashboard 数据** | Server Component + 并行查询 | 减少客户端 JS，提升首屏速度 |
| **表单交互** | Client Component + React State | 写评语、数据录入需要实时反馈 |
| **全局状态** | Zustand（轻量） | 仅用于跨组件共享（如选中学生、草稿评语） |
| **图表** | Recharts（已集成） | 班级六维雷达图复用学生端组件 |

### 1.2 后端 API 设计

```
/api/teachers/me                  GET    获取当前教师信息（角色、班级）
/api/teachers/me/students         GET    获取教师负责的学生列表
/api/teachers/me/dashboard        GET    获取 Dashboard 聚合数据
/api/teachers/me/warnings         GET    获取预警列表
/api/teachers/me/warnings/:id     POST   处理预警
/api/comments                     POST   提交评语
/api/comments/templates           GET    获取评语模板
/api/admin/dimensions/refresh     POST   刷新六维分数（管理员/定时）
/api/admin/dimensions/snapshot    POST   生成学期快照
```

### 1.3 数据流设计

```
教师操作 → API Route → Prisma Service → PostgreSQL
                ↓
          触发六维重算（如需要）
                ↓
          学生端实时更新（Next.js Cache Revalidate）
```

---

## 二、组件拆分

### 2.1 布局组件（基础骨架）

```
components/teacher/
├── teacher-layout.tsx          # 教师端整体布局（Sidebar + Header + Content）
├── teacher-sidebar.tsx         # 左侧导航栏
├── teacher-header.tsx          # 顶部栏
├── mobile-nav.tsx              # 移动端导航抽屉
└── breadcrumb.tsx              # 面包屑导航
```

### 2.2 Dashboard 组件

```
components/teacher/dashboard/
├── class-radar-card.tsx        # 班级六维雷达图卡片
├── warning-students-card.tsx   # 需关注学生卡片
├── todo-list-card.tsx          # 本周待办卡片
├── stat-cards.tsx              # 统计卡片行
└── dimension-detail-panel.tsx  # 雷达图点击下钻面板
```

### 2.3 学生管理组件

```
components/teacher/students/
├── student-table.tsx           # 学生列表表格
├── student-search-filter.tsx   # 搜索和筛选栏
└── student-detail-view.tsx     # 学生档案详情（弹窗/页面）
```

### 2.4 评语系统组件

```
components/teacher/comments/
├── comment-editor.tsx          # 评语编辑器（已存在，需升级）
├── dimension-tags.tsx          # 六维标签网格
├── ai-assistant-panel.tsx      # AI 评语助手面板
├── template-selector.tsx       # 模板选择器
└── student-selector.tsx        # 学生选择侧边栏
```

### 2.5 预警中心组件

```
components/teacher/warnings/
├── warning-list.tsx            # 预警列表
├── warning-filter.tsx          # 预警筛选器
├── warning-detail-modal.tsx    # 预警处理弹窗
└── warning-stats.tsx           # 预警统计卡片
```

### 2.6 数据录入组件

```
components/teacher/data-entry/
├── score-entry-table.tsx       # 成绩录入表格
├── excel-import-modal.tsx      # Excel 导入弹窗
├── fitness-entry-form.tsx      # 体测录入表单
├── psych-evaluation-form.tsx   # 心理状态评价表单
├── class-management-form.tsx   # 班级管理记录表单
└── peer-review-manager.tsx     # 互评管理面板
```

---

## 三、API 详细设计

### 3.1 GET /api/teachers/me/dashboard

返回 Dashboard 所需的全部聚合数据：

```typescript
interface DashboardResponse {
  teacher: { name: string; role: string };
  classStats: {
    studentCount: number;
    avgDimensions: Record<string, number>;  // 班级六维均值
    gradeAvgDimensions: Record<string, number>; // 年级六维均值
    balance: number;
  };
  warnings: WarningItem[];
  todos: TodoItem[];
}
```

**查询优化**：
- 使用 Prisma `groupBy` 计算班级六维均值
- 使用 `Promise.all` 并行查询多个数据源
- 结果缓存 5 分钟（Next.js unstable_cache）

### 3.2 POST /api/comments

提交评语：

```typescript
interface CreateCommentRequest {
  studentId: string;
  content: string;
  dimensionTags: {
    dimension: string;
    tags: string[];
  }[];
  semester: string;
}
```

**副作用**：
- 写入 Comment 表
- 触发六维分数重新计算
- 更新学生端缓存

### 3.3 GET /api/teachers/me/warnings

返回预警列表：

```typescript
interface WarningResponse {
  warnings: {
    id: string;
    studentId: string;
    studentName: string;
    type: string;        // PSYCHOLOGY / IMBALANCE / DECAY / DISCIPLINE / LOW_ENGAGEMENT
    severity: string;    // HIGH / MEDIUM / LOW / INFO
    description: string;
    triggeredAt: string;
    status: string;      // PENDING / PROCESSING / RESOLVED
  }[];
}
```

---

## 四、状态管理设计

### 4.1 Zustand Store：评语草稿

```typescript
interface CommentDraftStore {
  drafts: Record<string, {      // key: studentId
    content: string;
    tags: string[];
    savedAt: Date;
  }>;
  saveDraft: (studentId: string, content: string, tags: string[]) => void;
  loadDraft: (studentId: string) => CommentDraft | null;
  clearDraft: (studentId: string) => void;
}
```

### 4.2 Zustand Store：选中态

```typescript
interface TeacherUIStore {
  selectedStudentId: string | null;
  selectedClassId: string | null;
  sidebarCollapsed: boolean;
  setSelectedStudent: (id: string | null) => void;
  toggleSidebar: () => void;
}
```

---

## 五、测试策略

### 5.1 单元测试（Vitest）

| 测试对象 | 测试内容 | 工具 |
|----------|----------|------|
| 六维分数计算 | 归一化、标签计算、均衡度 | Vitest |
| 权限检查 | 角色权限矩阵 | Vitest |
| 数据转换 | 旧格式 → 新格式映射 | Vitest |
| API 路由 | 参数校验、权限拦截 | Vitest + MSW |

### 5.2 组件测试（Testing Library）

| 测试对象 | 测试内容 |
|----------|----------|
| TeacherSidebar | 菜单渲染、角色差异化、折叠展开 |
| CommentEditor | 标签勾选、字数统计、AI生成 |
| WarningList | 筛选排序、状态变更 |
| StudentTable | 搜索、排序、分页 |

### 5.3 E2E 测试（Playwright）

| 测试场景 | 测试内容 |
|----------|----------|
| 教师登录流程 | 登录 → Dashboard → 验证数据 |
| 写评语完整流程 | 选择学生 → 写评语 → 勾选标签 → 提交 → 验证分数更新 |
| 预警处理流程 | 查看预警 → 处理 → 验证状态变更 |

---

## 六、实现优先级（开发顺序）

```
Phase 1：基础骨架（导航+布局）
  ├─ teacher-sidebar.tsx
  ├─ teacher-header.tsx
  ├─ teacher-layout.tsx
  └─ 更新 (teacher)/layout.tsx

Phase 2：Dashboard
  ├─ GET /api/teachers/me/dashboard
  ├─ class-radar-card.tsx
  ├─ warning-students-card.tsx
  └─ stat-cards.tsx

Phase 3：学生列表
  ├─ GET /api/teachers/me/students
  ├─ student-table.tsx
  └─ student-search-filter.tsx

Phase 4：评语系统（核心）
  ├─ POST /api/comments
  ├─ comment-editor.tsx（升级）
  ├─ dimension-tags.tsx
  └─ ai-assistant-panel.tsx

Phase 5：预警中心
  ├─ GET /api/teachers/me/warnings
  ├─ warning-list.tsx
  └─ warning-detail-modal.tsx

Phase 6：其他模块
  ├─ 数据录入
  ├─ 报告生成
  └─ 审核中心

Phase 7：测试
  ├─ 单元测试
  ├─ 组件测试
  └─ E2E 测试
```

---

*本文档基于 BDD-教师端v1.0.md 推导，为教师端代码实现提供技术方案。*
