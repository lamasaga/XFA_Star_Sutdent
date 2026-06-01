# 新府学「一生一案」第一阶段 BDD — 家长端 + 学期档案 + API 分页

> **文档定位**：基于 PRD `docs/PRD-第一阶段-家长端与学期档案.md`，用 Gherkin 语法描述所有可验收的用户行为场景。  
> **读者**：前端工程师、测试工程师、产品经理  
> **执行方式**：每个 Feature 可独立开发、独立测试、独立验收  
> **最后更新**：2026-06-01

---

## Feature 目录

| # | Feature | 优先级 | 场景数 | 说明 |
|---|---------|--------|--------|------|
| 1 | [构建修复](#feature-1-构建修复) | 🔴 P0 | 4 | 教师/管理端 TypeScript 错误清零 |
| 2 | [API 统一分页](#feature-2-api-统一分页) | 🔴 P0 | 6 | 所有列表接口支持游标分页 |
| 3 | [家长端登录与绑定](#feature-3-家长端登录与绑定) | 🔴 P0 | 7 | 独立登录、学生绑定、权限控制 |
| 4 | [家长端首页概览](#feature-4-家长端首页概览) | 🔴 P0 | 6 | 孩子信息、五维状态、评语、公告 |
| 5 | [家长端档案与报告](#feature-5-家长端档案与报告) | 🟡 P1 | 5 | 成长档案只读、学期报告查看 |
| 6 | [家长端隐私控制](#feature-6-家长端隐私控制) | 🟡 P1 | 4 | 学生控制家长可见范围 |
| 7 | [学期档案生成](#feature-7-学期档案生成) | 🟡 P1 | 6 | 触发、聚合、AI 摘要、查看 |
| 8 | [端到端集成验证](#feature-8-端到端集成验证) | 🟡 P1 | 3 | 完整用户旅程 |

**总计：8 个 Feature，41 个 Scenario**

---

## Feature 1: 构建修复

> **背景**：教师端和管理端多个页面存在 TypeScript 类型错误，导致生产构建失败。必须先修复才能部署。

### 场景 1.1: 教师端学生列表页构建通过

```gherkin
Given 项目代码在最新状态
When 运行 "npm run build"
Then "app/(teacher)/t/students/page.tsx" 不产生 TypeScript 错误
And "app/(teacher)/t/class-profile/page.tsx" 不产生 TypeScript 错误
And "app/(teacher)/t/comments/page.tsx" 不产生 TypeScript 错误
And "app/(teacher)/t/warnings/page.tsx" 不产生 TypeScript 错误
```

### 场景 1.2: 管理端学生/班级/教师页构建通过

```gherkin
Given 项目代码在最新状态
When 运行 "npm run build"
Then "app/(admin)/a/students/page.tsx" 不产生 TypeScript 错误
And "app/(admin)/a/classes/page.tsx" 不产生 TypeScript 错误
And "app/(admin)/a/teachers/page.tsx" 不产生 TypeScript 错误
And "app/(admin)/a/settings/page.tsx" 不产生 TypeScript 错误
And "app/(admin)/a/reports/page.tsx" 不产生 TypeScript 错误
And "app/(admin)/a/assessments/page.tsx" 不产生 TypeScript 错误
```

### 场景 1.3: Prisma 查询类型正确

```gherkin
Given 教师端学生列表页使用 Prisma 查询学生成绩
When 代码包含成绩查询逻辑
Then 不使用 "include: { exam: true }"（Score 模型无 exam 关系）
And 使用 "select" 显式指定需要的字段
And 查询结果类型与前端消费类型一致
```

### 场景 1.4: 全项目构建零错误零警告

```gherkin
Given 所有页面代码已修复
When 运行 "npm run build"
Then 控制台不输出任何 TypeScript 类型错误
And 控制台不输出任何 ESLint 错误（配置允许除外）
And 构建成功生成 .next 目录
```

---

## Feature 2: API 统一分页

> **背景**：当前所有列表 API 返回全量数据，学生规模扩大后存在性能隐患。需要统一实现游标分页。

### 场景 2.1: 列表 API 支持 limit 参数

```gherkin
Given 后端 API 已实现分页
When 调用 "GET /api/comments?limit=5"
Then 响应状态码为 200
And 响应 data 数组长度不超过 5
And 响应包含 pagination 对象
```

### 场景 2.2: 列表 API 支持 cursor 参数

```gherkin
Given 已有评论数据 25 条
When 调用 "GET /api/comments?limit=10"
Then 返回 10 条数据
And pagination.hasMore 为 true
And pagination.nextCursor 不为空

When 使用 nextCursor 调用 "GET /api/comments?limit=10&cursor={nextCursor}"
Then 返回第 11~20 条数据
And pagination.hasMore 为 true

When 再次使用 nextCursor 调用
Then 返回第 21~25 条数据
And pagination.hasMore 为 false
And pagination.nextCursor 为空
```

### 场景 2.3: 不传参数时向后兼容

```gherkin
Given 前端未适配分页参数
When 调用 "GET /api/comments"（无 limit 无 cursor）
Then 响应状态码为 200
And 返回默认数量（20 条）
And 响应包含 data 数组
And 响应包含 pagination 对象
```

### 场景 2.4: 分页适用于所有列表 API

```gherkin
Given 后端已实现统一分页中间件
Then 以下 API 均支持 limit + cursor 参数：
  | API 路径               |
  | /api/comments          |
  | /api/milestones        |
  | /api/activities        |
  | /api/scores            |
  | /api/mood              |
  | /api/assessments       |
  | /api/students          |
  | /api/teachers          |
  | /api/warnings          |
  | /api/semester-reports  |
```

### 场景 2.5: 分页游标无重复无遗漏

```gherkin
Given 数据库中有按时间排序的记录 100 条
When 逐页拉取所有数据（limit=10，使用 nextCursor）
Then 拉取到的总记录数为 100
And 没有重复记录（按 id 去重后仍为 100）
And 没有遗漏记录（与数据库直接查询 100 条对比一致）
```

### 场景 2.6: 聚合 API 内部使用分页

```gherkin
Given Profile 页面调用聚合 API
When 后端处理 "/api/students/me/profile"
Then 内部查询评语时使用分页（limit=20）
And 内部查询里程碑时使用分页（limit=20）
And 内部查询活动记录时使用分页（limit=20）
And 对外仍返回聚合后的完整结果
```

---

## Feature 3: 家长端登录与绑定

> **背景**：家长端是独立入口，需要独立登录体系和与学生的绑定机制。

### 场景 3.1: 家长可访问独立登录页

```gherkin
Given 家长未登录
When 访问 "/parent/login"
Then 页面显示家长登录表单
And 表单包含：手机号/邮箱输入框、密码输入框、登录按钮
And 页面不包含学生端导航元素
```

### 场景 3.2: 家长使用正确凭据登录成功

```gherkin
Given 家长账号已注册（手机号 13800138000，密码正确）
When 在登录页输入手机号 13800138000 和正确密码
And 点击登录按钮
Then 页面导航到 "/parent"
And 页面显示绑定孩子的概览信息
```

### 场景 3.3: 家长使用错误凭据登录失败

```gherkin
Given 家长账号已注册
When 在登录页输入错误密码
And 点击登录按钮
Then 页面停留在 "/parent/login"
And 显示错误提示"手机号或密码错误"
And 不泄露账号是否存在的信息
```

### 场景 3.4: 家长登录后角色为 PARENT

```gherkin
Given 家长已成功登录
When 检查 session 中的 user.role
Then 值为 "PARENT"
And 不是 "STUDENT" / "TEACHER" / "ADMIN"
```

### 场景 3.5: 未绑定学生的家长显示空状态

```gherkin
Given 家长已成功登录
And 家长尚未绑定任何学生
When 访问 "/parent"
Then 页面显示提示"您尚未绑定学生"
And 显示绑定指引："请联系班主任或学生获取绑定码"
And 不显示任何学生数据
```

### 场景 3.6: 家长只能查看绑定的孩子

```gherkin
Given 家长 A 绑定了学生张明（学号 20280101）
And 家长 A 未绑定学生李华（学号 20280102）
When 家长 A 访问 "/parent"
Then 页面只显示张明的信息
And 不显示李华的任何信息

When 家长 A 尝试通过 URL 参数或其他方式访问李华的数据
Then 返回 403 Forbidden
And 显示"您无权查看该学生信息"
```

### 场景 3.7: 家长端权限隔离

```gherkin
Given 家长已成功登录
When 家长尝试访问学生端页面（如 "/dashboard"）
Then 重定向到 "/parent"

When 家长尝试访问教师端页面（如 "/teacher"）
Then 返回 403 Forbidden

When 家长尝试访问管理端页面（如 "/admin"）
Then 返回 403 Forbidden
```

---

## Feature 4: 家长端首页概览

> **背景**：家长打开系统应 3 秒内了解孩子近况，无需翻页操作。

### 场景 4.1: 首页显示孩子基本信息

```gherkin
Given 家长已登录并绑定了学生张明
When 访问 "/parent"
Then 页面顶部显示：
  | 信息项     | 值           |
  | 姓名       | 张明         |
  | 班级       | 高一1班      |
  | 学号       | 20280101     |
  | 年级       | 高一         |
```

### 场景 4.2: 首页显示五维状态（简化版）

```gherkin
Given 家长已登录并绑定了学生张明
And 张明的五维分数为：学业 80，心理 65，职业 55，社交 75，特长 70
When 访问 "/parent"
Then 页面显示"本周五维状态"区域
And 显示 5 个进度条（不是雷达图）
And 学业进度条显示 80%
And 心理进度条显示 65%
And 心理进度条颜色为橙色（低于 70 预警阈值）
And 职业进度条显示 55%
And 职业进度条颜色为红色（低于 60 预警阈值）
```

### 场景 4.3: 首页显示最新教师评语

```gherkin
Given 家长已登录并绑定了学生张明
And 张明本学期有 5 条教师评语
When 访问 "/parent"
Then 页面显示"最新教师评语"区域
And 显示最近 3 条评语
And 每条评语显示：内容摘要、教师姓名、日期
And 显示"查看全部评语"链接（跳转到 "/parent/profile"）
```

### 场景 4.4: 首页显示学校公告

```gherkin
Given 家长已登录
And 学校发布了 3 条公告（下周三月考、周五家长会、端午节放假）
When 访问 "/parent"
Then 页面显示"学校安排"区域
And 显示最近 3 条公告
And 公告按时间倒序排列
And 每条公告显示标题和发布日期
```

### 场景 4.5: 首页纯只读无操作按钮

```gherkin
Given 家长已登录并访问 "/parent"
When 检查页面所有可交互元素
Then 不存在表单提交按钮
And 不存在"编辑"、"删除"、"新增"等操作按钮
And 存在"查看全部"链接（跳转到详情页）
And 存在导航链接（档案、报告、设置）
```

### 场景 4.6: 心理预警在首页高亮

```gherkin
Given 家长已登录并绑定了学生张明
And 张明最近心理测评显示焦虑分数偏高（风险等级 WARNING）
When 访问 "/parent"
Then 首页顶部显示预警横幅
And 横幅颜色为红色/橙色
And 文字为"心理预警：张明近期心理压力较大，请关注"
And 显示"查看详情"链接
And 预警信息比学生端更突出（家长端优先级更高）
```

---

## Feature 5: 家长端档案与报告

> **背景**：家长可深入查看孩子的成长档案和学期报告，但仍是只读。

### 场景 5.1: 家长查看孩子成长档案

```gherkin
Given 家长已登录并绑定了学生张明
When 点击首页"查看全部"或导航到 "/parent/profile"
Then 页面显示"张明 成长档案"
And 显示五维雷达图（完整版）
And 显示本学期成绩汇总
And 显示全部里程碑列表
And 显示全部活动记录
And 显示全部教师评语（支持展开/折叠）
And 所有数据均为只读展示
```

### 场景 5.2: 家长查看学期报告列表

```gherkin
Given 家长已登录并绑定了学生张明
And 系统已生成 2 份学期报告（2025-2026-1、2025-2026-2）
When 访问 "/parent/reports"
Then 页面显示学期报告列表
And 按学期倒序排列
And 每条报告显示：学期名称、生成日期、状态（已生成/生成中）
And 已生成的报告显示"查看"链接
```

### 场景 5.3: 家长查看单份学期报告

```gherkin
Given 家长已登录
And 2025-2026-2 学期报告已生成
When 点击"查看"进入报告详情页
Then 页面显示完整学期档案：
  | 模块         | 内容                     |
  | 学业成绩     | 期中/期末各科成绩对比     |
  | 五维变化     | 学期初 vs 学期末雷达图    |
  | 里程碑亮点   | 本学期通过的里程碑        |
  | 教师评语     | 本学期全部评语            |
  | 活动记录     | 本学期活动及积分          |
  | 心情概览     | 本学期心情统计（无明细）  |
  | AI 成长建议  | 个性化建议文字            |
```

### 场景 5.4: 家长端移动端适配

```gherkin
Given 家长使用手机访问（视口宽度 < 768px）
When 访问 "/parent"
Then 页面无横向滚动
And 所有内容在单栏布局中正常显示
And 五维进度条宽度自适应
And 教师评语卡片不溢出屏幕
And 底部导航栏固定可见（首页/档案/报告/设置）
```

### 场景 5.5: 家长设置页面

```gherkin
Given 家长已登录
When 访问 "/parent/settings"
Then 页面显示通知偏好设置
And 选项包括：
  - 教师新评语通知
  - 心理预警即时通知
  - 学期档案生成通知
  - 学校公告通知
And 显示账号安全设置（修改密码）
And 不显示任何学生数据编辑选项
```

---

## Feature 6: 家长端隐私控制

> **背景**：学生有权控制家长可见的数据范围，保护隐私。

### 场景 6.1: 学生可设置家长可见范围

```gherkin
Given 学生张明已登录
When 访问 "/settings"
Then 设置页面包含"家长可见范围"区域
And 显示以下开关：
  | 数据项       | 默认状态 |
  | 五维雷达分数 | 开启     |
  | 教师评语     | 开启     |
  | 成绩明细     | 开启     |
  | 里程碑       | 开启     |
  | 活动记录     | 开启     |
  | 心情日记     | 关闭     |
```

### 场景 6.2: 关闭后家长端不显示对应数据

```gherkin
Given 学生张明关闭了"成绩明细"的家长可见开关
And 家长已登录并访问 "/parent/profile"
When 查看成绩区域
Then 显示"张明设置了成绩详情不可见"
And 不显示任何成绩数据
And 显示提示"如有疑问请与孩子沟通"
```

### 场景 6.3: 学生关闭心情日记家长不可见

```gherkin
Given 心情日记默认对家长关闭
When 学生未开启该开关
Then 家长端任何地方不显示心情日记数据
And 家长端"/parent/profile"不显示心情日历
And 学期报告中的"心情概览"显示"该学生未开启心情分享"
```

### 场景 6.4: 隐私设置即时生效

```gherkin
Given 学生张明开启了"成绩明细"家长可见
And 家长正在查看 "/parent/profile" 的成绩区域
When 学生张明关闭"成绩明细"开关
And 家长刷新页面
Then 成绩区域立即显示为不可见状态
And 无需重新登录
```

---

## Feature 7: 学期档案生成

> **背景**：期末自动生成学生的完整成长档案，聚合全学期数据。

### 场景 7.1: 管理端触发单学生档案生成

```gherkin
Given 管理员已登录
And 学生张明在 2025-2026-2 学期有数据
When 在管理端找到张明
And 点击"生成学期档案"按钮
Then 系统显示"档案生成中，请稍候"
And 后端启动异步生成任务
And 不阻塞管理端页面操作
```

### 场景 7.2: 管理端批量生成全班档案

```gherkin
Given 管理员已登录
And 高一1班有 30 名学生
And 本学期数据完整
When 在班级管理页选择"高一1班"
And 点击"批量生成学期档案"
And 确认操作
Then 系统为全班 30 名学生逐一启动生成任务
And 显示进度"已生成 5/30"
And 每名学生档案独立生成，互不影响
And 全部完成后显示"生成完毕"
```

### 场景 7.3: 学期档案数据聚合正确

```gherkin
Given 学生张明在 2025-2026-2 学期有以下数据：
  | 数据类型 | 数量 | 说明                |
  | 成绩     | 8 条 | 期中 5 科 + 期末 5 科 |
  | 评语     | 6 条 | 班主任 + 各科教师     |
  | 里程碑   | 3 条 | 全部已通过            |
  | 活动     | 5 条 | 社团 + 比赛           |
  | 心情记录 | 60 条| 几乎每天记录          |
When 学期档案生成完成
Then 档案中成绩数据包含全部 8 条
And 档案中评语包含全部 6 条
And 档案中里程碑包含全部 3 条
And 档案中活动包含全部 5 条
And 心情概览显示统计信息（不显示每日明细）
  | 平均心情 | 4.2          |
  | 最高频率 | "不错"（4 分）|
  | 记录天数 | 60 天        |
```

### 场景 7.4: 学期档案包含 AI 成长建议

```gherkin
Given 学生张明的学期档案已聚合完成
And 五维变化为：学业 +10，心理 +2，职业 +5，社交 +8，特长 +5
When 系统调用 DeepSeek API 生成 AI 建议
Then 档案中包含非空的 aiSummary 字段
And 建议文字中包含"学业"和"社交"（进步最大的维度）
And 建议文字长度在 200~500 字之间
And 建议文字为中文
```

### 场景 7.5: 学生和家长可查看已生成档案

```gherkin
Given 学生张明的 2025-2026-2 学期档案已生成（状态 READY）
When 学生登录并访问 "/semester-reports"
Then 报告显示"2025-2026 第二学期档案"
And 状态为"已生成"
And 点击可查看完整档案

When 家长登录并访问 "/parent/reports"
Then 同样显示"2025-2026 第二学期档案"
And 点击可查看完整档案（只读）
```

### 场景 7.6: 档案生成失败可重试

```gherkin
Given 某次档案生成任务因 DeepSeek API 超时失败
And 档案状态为 ERROR
When 管理员在管理端查看该学生
Then 显示"档案生成失败"
And 显示失败原因"AI 服务超时"
And 显示"重试生成"按钮

When 点击"重试生成"
Then 重新启动生成任务
And 状态变为 GENERATING
And 完成后状态变为 READY 或 ERROR
```

---

## Feature 8: 端到端集成验证

> **背景**：验证完整用户旅程，确保各模块协同工作。

### 场景 8.1: 完整家长旅程

```gherkin
Given 家长首次使用系统
When 访问 "/parent/login"
And 输入手机号和密码登录
Then 进入 "/parent" 首页
And 看到孩子基本信息和五维状态

When 点击"成长档案"
Then 进入 "/parent/profile"
And 看到完整的五维雷达和成长时间线

When 点击"学期报告"
Then 进入 "/parent/reports"
And 看到已生成的学期报告列表

When 点击"设置"
Then 进入 "/parent/settings"
And 可修改通知偏好
```

### 场景 8.2: 完整学期档案生成旅程

```gherkin
Given 学期末，管理员登录管理端
When 选择高一1班
And 点击"批量生成学期档案"
Then 系统开始为全班生成档案

When 生成完成后
Then 学生登录系统，在 "/semester-reports" 看到新档案
And 家长登录系统，在 "/parent/reports" 看到新档案
And 学生收到通知"您的学期档案已生成"
And 家长收到通知"张明的学期档案已生成"
```

### 场景 8.3: 隐私设置端到端验证

```gherkin
Given 学生张明登录 "/settings"
When 关闭"成绩明细"家长可见开关
Then 设置保存成功

When 家长刷新 "/parent/profile"
Then 成绩区域显示"不可见"

When 学生重新开启"成绩明细"开关
Then 家长刷新后成绩区域恢复正常显示
```

---

## 附录：验收清单

### 技术验收

- [ ] `npm run build` 零错误
- [ ] 所有列表 API 支持 `limit` + `cursor`
- [ ] 分页游标无重复无遗漏（100 条数据分页测试）
- [ ] 聚合 API 内部使用分页后 Profile 加载 < 500ms

### 功能验收

- [ ] 家长可独立登录 `/parent/login`
- [ ] 家长只能查看绑定孩子的数据
- [ ] 家长端所有页面无操作按钮（纯只读）
- [ ] 学生 Settings 中可控制家长可见范围
- [ ] 关闭可见后家长端即时生效
- [ ] 学期档案可从管理端触发生成
- [ ] 学期档案包含：成绩、五维变化、评语、里程碑、活动、AI 建议
- [ ] 学生和家长均可查看已生成档案

### 性能验收

- [ ] 家长首页加载 < 1 秒
- [ ] 学期报告详情页加载 < 1 秒（预生成数据）
- [ ] 分页 API 响应 < 200ms（limit=20）
- [ ] 批量生成 30 人班级档案 < 5 分钟

### 安全验收

- [ ] 家长无法访问学生/教师/管理端页面
- [ ] 家长无法通过 URL 参数查看未绑定学生数据
- [ ] 家长端 API 返回 403 当访问他人数据时
- [ ] 心理预警详情不对家长开放（只显示预警级别）

---

*新府学 BizSim Edu · 第一阶段 BDD · 2026-06-01*
