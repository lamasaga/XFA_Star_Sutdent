# 新府学「一生一案」第一阶段 PRD — 上线准备（家长端 + 学期档案 + API 分页）

> **文档定位**：第一阶段核心交付物的产品需求文档，涵盖家长端只读概览、学期档案自动生成、API 统一分页优化。所有需求均可验收、可测试。
> **读者**：前端工程师、后端工程师、测试工程师、产品经理
> **对齐文档**：`ROADMAP-v2.md`（第一阶段：可上线）
> **最后更新**：2026-06-01

---

## 一、问题诊断

### 1.1 家长端缺失 — 家校沟通断链

**现状**：系统只有学生/教师/管理员三端，家长无法查看孩子成长数据。

**影响**：
- 教师需要单独找家长沟通，效率低
- 家长对孩子在校情况一无所知
- 心理预警无法及时触达家长

**目标**：家长可通过独立入口查看孩子的只读成长概览。

### 1.2 学期档案缺失 — 期末刚需未满足

**现状**：`semester-reports` 页面为占位页面，无自动生成逻辑。

**影响**：
- 期末教师需要手动整理每个学生的档案
- 学生无法回顾整学期成长轨迹
- 家长无法收到学期总结

**目标**：期末一键生成学生学期档案（网页版 + PDF 版）。

### 1.3 API 分页缺失 — 数据量隐患

**现状**：11 个列表 API 均未实现分页，返回全量数据。

**影响**：
- 学生数量增加后 API 响应变慢
- 前端渲染大数据量列表卡顿
- 数据库查询性能下降

**目标**：所有列表 API 支持游标分页（cursor/limit）。

### 1.4 教师/管理端构建错误 — 无法部署

**现状**：教师端和管理端多个页面存在 TypeScript 类型错误，构建失败。

**影响**：
- 生产环境无法部署
- 教师/管理员无法使用系统

**目标**：所有页面 `npm run build` 零错误。

---

## 二、重构原则

### 2.1 "家长端 = 只读 + 最少展示 + 学生可控"

- 家长端没有任何操作按钮（纯信息展示）
- 默认只展示基础信息，学生可设置可见范围
- 心理预警比学生端更敏感（即时通知）

### 2.2 "学期档案 = 期末自动聚合 + 预生成 + 双格式"

- 期末教师一键触发，后端异步聚合数据
- 生成网页版（互动）存入数据库 + PDF 版存入对象存储
- 学生/家长打开时直接读取，无需实时计算

### 2.3 "分页 = 统一模式 + 向后兼容"

- 所有列表 API 统一使用 `limit` + `cursor` 游标分页
- 不破坏现有前端调用（不传分页参数时返回默认值）
- 前端逐步适配分页参数

---

## 三、家长端设计

### 3.1 路由与权限

| 属性 | 值 |
|------|------|
| 路由 | `/parent` |
| 登录方式 | 独立账号（手机号+验证码 / 账号密码） |
| 权限 | 只读，仅查看自己绑定的孩子 |
| 角色标识 | `PARENT` |

**绑定关系**：
- 一个学生可绑定 1~2 位家长
- 家长在注册时输入学生学号 + 验证码（由学生或教师提供）完成绑定
- 绑定后不可自行解绑，需联系管理员

### 3.2 页面结构

```
家长端
├── /parent/login          ← 家长登录页（独立）
├── /parent                ← 家长首页（孩子概览）
│   ├── 孩子基本信息卡片
│   ├── 本周五维状态（简化雷达 + 分数）
│   ├── 最新教师评语（最近 3 条）
│   ├── 学校公告 / 安排
│   └── 心理预警通知（如有）
│
├── /parent/profile        ← 孩子成长档案（只读版）
│   ├── 五维雷达图
│   ├── 学期成绩汇总
│   ├── 里程碑列表
│   ├── 活动记录
│   └── 教师评语（全部）
│
├── /parent/reports        ← 学期报告列表
│   └── 各学期档案入口
│
└── /parent/settings       ← 家长设置
    ├── 通知偏好
    └── 账号安全
```

### 3.3 家长首页详细设计

```
┌────────────────────────────────────────┐
│  👤 张明 高一1班                        │
│  学号：20280101                          │
├────────────────────────────────────────┤
│  📊 本周五维状态                         │
│  学业 ████████░░ 80                     │
│  心理 ██████░░░░ 60  ⚠️ 需关注           │
│  职业 █████░░░░░ 50                     │
│  社交 ████████░░ 80                     │
│  特长 ███████░░░ 70                     │
├────────────────────────────────────────┤
│  📝 最新教师评语                         │
│  "张明这周在数学竞赛准备上很努力..."     │
│  — 李老师 · 2026-05-20                   │
│                                        │
│  "英语演讲比赛表现突出，继续加油！"      │
│  — 王老师 · 2026-05-15                   │
│                                        │
│  [查看全部评语]                          │
├────────────────────────────────────────┤
│  📅 学校安排                             │
│  • 下周三月考                           │
│  • 周五家长会                           │
│  • 端午节放假通知                        │
├────────────────────────────────────────┤
│  📑 学期报告                             │
│  2025-2026 第二学期档案已生成            │
│  [查看档案]                              │
└────────────────────────────────────────┘
```

**设计要点**：
- 无操作按钮，纯信息展示
- 五维分数用进度条而非雷达图（更直观）
- 心理预警用红色高亮，家长最关注
- 评语只显示最近 3 条，带"查看全部"入口
- 学校公告由管理端发布，家长端只读

### 3.4 数据权限控制

**学生可控制家长可见范围**：

| 数据项 | 默认可见 | 学生可关闭 |
|--------|----------|------------|
| 基本信息（姓名/班级/学号） | ✅ | ❌ |
| 五维雷达分数 | ✅ | ✅ |
| 教师评语 | ✅ | ✅ |
| 成绩明细 | ✅ | ✅ |
| 里程碑 | ✅ | ✅ |
| 活动记录 | ✅ | ✅ |
| 心情日记 | ❌ | ✅（可开启）|
| 心理测评详情 | ❌ | ❌（仅预警可见）|

**隐私设置存储**：`student.privacySettings: JSON`

```json
{
  "parentVisible": {
    "fiveDimensions": true,
    "comments": true,
    "scores": true,
    "milestones": true,
    "activities": true,
    "mood": false
  }
}
```

---

## 四、学期档案设计

### 4.1 触发时机

- **自动触发**：每学期最后一周，系统检测到期末标记后自动触发
- **手动触发**：教师/管理员可在管理端点击"生成学期档案"
- **批量触发**：管理员可选择一个班级，批量生成全班档案

### 4.2 数据聚合范围

| 数据类型 | 聚合内容 | 来源 |
|----------|----------|------|
| 成绩汇总 | 本学期所有考试成绩、平均分、排名变化 | Score 表 |
| 五维变化 | 学期初 vs 学期末雷达对比 | Student.fiveDimensions 历史快照 |
| 评语精选 | 本学期所有教师评语（去重/按时间排序）| Comment 表 |
| 里程碑亮点 | 本学期通过的里程碑（按类型分类）| Milestone 表 |
| 活动记录 | 本学期参与的活动及积分 | Activity 表 |
| 心情概览 | 本学期心情记录统计（不显示每日明细）| MoodEntry 表 |
| AI 成长建议 | 基于五维变化生成的个性化建议 | DeepSeek API |

### 4.3 生成流程

```
教师/管理员触发
    ↓
后端异步任务启动（队列/定时任务）
    ↓
1. 聚合数据（成绩/评语/里程碑/活动/心情）
2. 计算五维变化（学期初 vs 学期末）
3. 调用 DeepSeek API 生成 AI 成长建议
4. 生成网页版 JSON 存入 semester_report 表
5. 生成 PDF 版存入对象存储（预留 MinIO）
6. 通知学生/家长"学期档案已生成"
    ↓
学生/家长打开时直接读取预生成数据
```

### 4.4 网页版档案页面设计

```
┌────────────────────────────────────────┐
│  张明 · 2025-2026 第二学期成长档案      │
│  生成时间：2026-07-01                    │
├────────────────────────────────────────┤
│  📊 学业成绩                             │
│  期中：语文 88 · 数学 95 · 英语 92 · ...│
│  期末：语文 90 · 数学 98 · 英语 94 · ...│
│  [柱状图对比]                            │
├────────────────────────────────────────┤
│  🎯 五维成长                             │
│  [学期初雷达] → [学期末雷达]             │
│  学业：75 → 85（+10）✨                 │
│  心理：70 → 72（+2）                    │
│  职业：55 → 60（+5）                    │
│  社交：80 → 88（+8）✨                 │
│  特长：65 → 70（+5）                    │
├────────────────────────────────────────┤
│  🏆 里程碑亮点                           │
│  英语演讲比赛一等奖 · 2026-05-28         │
│  期中考试班级第5名 · 2026-05-25          │
│  加入机器人社团 · 2026-05-15             │
├────────────────────────────────────────┤
│  📝 教师评语精选                          │
│  [本学期所有评语列表]                    │
├────────────────────────────────────────┤
│  🤖 AI 成长建议                          │
│  "本学期你在学业和社交维度进步最大..."   │
│  "建议下学期重点关注职业规划..."         │
├────────────────────────────────────────┤
│  [下载 PDF 版] [分享]                    │
└────────────────────────────────────────┘
```

### 4.5 数据库设计

**新增表：semester_report**

```prisma
model SemesterReport {
  id          String   @id @default(cuid())
  studentId   String
  semester    String   // 如 "2025-2026-2"
  title       String   // "2025-2026 第二学期成长档案"
  content     Json     // 完整档案数据（JSON 格式）
  aiSummary   String?  // AI 生成的成长建议摘要
  pdfUrl      String?  // PDF 版链接（预留）
  status      String   // DRAFT / GENERATING / READY / ERROR
  generatedAt DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  student     Student  @relation(fields: [studentId], references: [id])

  @@index([studentId, semester])
  @@index([status, generatedAt])
}
```

---

## 五、API 统一分页设计

### 5.1 分页模式

统一使用 **游标分页（Cursor Pagination）**：

```
GET /api/comments?limit=20&cursor=xxx
GET /api/milestones?limit=20&cursor=xxx
GET /api/activities?limit=20&cursor=xxx
GET /api/scores?limit=20&cursor=xxx
GET /api/mood?limit=30&cursor=xxx
```

**参数**：
- `limit`：每页数量，默认 20，最大 100
- `cursor`：游标，基于 `id` + `createdAt` 编码

**响应格式**：

```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6ImN0LTEwIiwiY3JlYXRlZEF0IjoiMjAyNi0wNS0yMFQxMDowMDowMFoifQ==",
    "hasMore": true,
    "total": 156
  }
}
```

### 5.2 向后兼容

- 不传 `limit` 和 `cursor` 时，返回默认 20 条（不破坏现有前端）
- 前端逐步传参适配
- 现有聚合 API（如 `/api/students/me/profile`）内部查询使用分页，但对外仍返回聚合结果

### 5.3 需要分页的 API 清单

| API | 当前状态 | 分页字段 |
|-----|----------|----------|
| GET /api/comments | 全量返回 | `createdAt` 降序 |
| GET /api/milestones | 全量返回 | `createdAt` 降序 |
| GET /api/activities | 全量返回 | `createdAt` 降序 |
| GET /api/scores | 全量返回 | `examDate` 降序 |
| GET /api/mood | 全量返回 | `date` 降序 |
| GET /api/assessments | 全量返回 | `createdAt` 降序 |
| GET /api/students | 全量返回 | `createdAt` 降序 |
| GET /api/teachers | 全量返回 | `createdAt` 降序 |
| GET /api/warnings | 全量返回 | `createdAt` 降序 |
| GET /api/semester-reports | 全量返回 | `generatedAt` 降序 |

---

## 六、教师/管理端构建修复

### 6.1 已知错误清单

| 文件 | 错误类型 | 说明 |
|------|----------|------|
| `app/(teacher)/t/students/page.tsx` | Prisma 类型 | `ScoreInclude` 中 `exam` 字段不存在 |
| `app/(admin)/a/students/page.tsx` | Prisma 类型 | `select` + `include` 冲突，元组解构错误 |
| `app/(admin)/a/classes/page.tsx` | TypeScript | `onValueChange` 类型不匹配 |
| `app/(admin)/a/teachers/page.tsx` | TypeScript | `onValueChange` 类型不匹配 |
| `app/(teacher)/t/class-profile/page.tsx` | 可能存在的类型错误 | 需检查 |
| `app/(teacher)/t/comments/page.tsx` | 可能存在的类型错误 | 需检查 |
| `app/(teacher)/t/warnings/page.tsx` | 可能存在的类型错误 | 需检查 |

### 6.2 修复策略

1. **Prisma 类型错误**：移除 `include: { exam: true }`，改用 `select` 显式字段
2. **`select` + `include` 冲突**：改为纯 `select` 方案，手动构建返回数据结构
3. **`onValueChange` 类型**：明确类型标注 `(value: string) => void`
4. **批量检查**：运行 `npm run build` 获取完整错误列表，逐条修复

---

## 七、实施优先级

| 优先级 | 任务 | 工作量 | 依赖 | 说明 |
|--------|------|--------|------|------|
| **P0** | 修复构建错误 | 1 天 | 无 | 阻塞所有部署 |
| **P0** | API 统一分页 | 2 天 | 无 | 数据量安全基础 |
| **P0** | 家长端数据库模型 + API | 2 天 | 无 | 新增 parent_account + binding |
| **P0** | 家长端登录页 + 首页 | 2 天 | API | 只读概览 |
| **P0** | 家长端档案/报告/设置页 | 2 天 | 首页 | 剩余页面 |
| **P1** | 学期档案数据库模型 + API | 1 天 | 无 | 新增 semester_report |
| **P1** | 学期档案生成逻辑 | 2 天 | API | 数据聚合 + AI 摘要 |
| **P1** | 学期档案网页版页面 | 1 天 | 生成逻辑 | 学生/家长可查看 |
| **P1** | 管理端批量生成界面 | 1 天 | 生成逻辑 | 教师/管理员触发 |
| **P2** | 家长端通知推送 | 1 天 | 首页 | 预警即时通知 |
| **P2** | PDF 生成（预留） | 1 天 | 生成逻辑 | 可延后到第二阶段 |

**总工期**：约 **2 周**（前端 + 后端各 1 人）

---

## 八、验收标准

### 8.1 家长端验收

- [ ] 家长可通过 `/parent/login` 独立登录
- [ ] 家长首页显示绑定孩子的基本信息和五维分数
- [ ] 家长只能查看自己绑定的孩子，无法查看他人
- [ ] 家长端没有任何操作按钮（纯只读）
- [ ] 学生可在 Settings 中控制家长可见范围
- [ ] 心理预警在家长端红色高亮显示
- [ ] 移动端适配正常（无遮挡/无横向滚动）

### 8.2 学期档案验收

- [ ] 管理端可点击"生成学期档案"触发
- [ ] 生成过程异步执行，不阻塞页面
- [ ] 生成后学生可在 `/semester-reports` 查看
- [ ] 家长可在 `/parent/reports` 查看
- [ ] 档案包含：成绩汇总、五维变化、评语、里程碑、活动、AI 建议
- [ ] 生成失败时显示错误状态并可重试

### 8.3 API 分页验收

- [ ] 所有列表 API 支持 `?limit=20&cursor=xxx`
- [ ] 不传参数时返回默认 20 条（向后兼容）
- [ ] 返回格式包含 `data` + `pagination.nextCursor` + `pagination.hasMore`
- [ ] 游标基于唯一字段（id + createdAt），无重复/遗漏
- [ ] 分页后聚合 API 性能提升（Profile 加载 < 500ms）

### 8.4 构建验收

- [ ] `npm run build` 零错误、零警告
- [ ] 教师端所有页面可正常访问
- [ ] 管理端所有页面可正常访问
- [ ] 学生端所有页面保持现有功能

---

## 九、新增/修改文件清单

### 9.1 新增文件

| 文件 | 说明 |
|------|------|
| `app/(parent)/layout.tsx` | 家长端共享布局（极简，无侧边栏） |
| `app/(parent)/login/page.tsx` | 家长登录页 |
| `app/(parent)/page.tsx` | 家长首页（孩子概览） |
| `app/(parent)/profile/page.tsx` | 孩子成长档案（只读） |
| `app/(parent)/reports/page.tsx` | 学期报告列表 |
| `app/(parent)/settings/page.tsx` | 家长设置 |
| `app/api/parent/login/route.ts` | 家长登录 API |
| `app/api/parent/me/route.ts` | 家长个人信息 API |
| `app/api/parent/student/route.ts` | 家长查看孩子数据 API |
| `app/api/semester-reports/route.ts` | 学期档案列表 API |
| `app/api/semester-reports/[id]/route.ts` | 学期档案详情 API |
| `app/api/semester-reports/generate/route.ts` | 触发生成 API |
| `lib/pagination.ts` | 统一分页工具函数 |
| `lib/semester-report-generator.ts` | 学期档案生成器 |

### 9.2 修改文件

| 文件 | 修改内容 |
|------|----------|
| `prisma/schema.prisma` | 新增 ParentAccount、ParentBinding、SemesterReport 表 |
| `lib/auth.ts` | 增加 PARENT 角色支持 |
| `app/(student)/settings/page.tsx` | 增加隐私设置（家长可见范围） |
| `app/api/comments/route.ts` | 添加分页参数 |
| `app/api/milestones/route.ts` | 添加分页参数 |
| `app/api/activities/route.ts` | 添加分页参数 |
| `app/api/scores/route.ts` | 添加分页参数 |
| `app/api/mood/route.ts` | 添加分页参数 |
| `app/(teacher)/t/students/page.tsx` | 修复 Prisma 类型错误 |
| `app/(admin)/a/students/page.tsx` | 修复 select/include 冲突 |
| `app/(admin)/a/classes/page.tsx` | 修复 onValueChange 类型 |
| `app/(admin)/a/teachers/page.tsx` | 修复 onValueChange 类型 |

---

*新府学 BizSim Edu · 第一阶段 PRD · 2026-06-01*
