# 新府学「一生一案」学生端信息架构重构 — BDD 行为驱动开发验收文档

> **文档定位**：基于 PRD `docs/PRD-学生端信息架构重构.md`，用 Gherkin 语法描述所有可验收的用户行为场景。  
> **读者**：前端工程师、测试工程师、产品经理  
> **执行方式**：每个 Feature 可独立开发、独立测试、独立验收  
> **最后更新**：2026-06-01

---

## Feature 目录

| # | Feature | 优先级 | 场景数 | 说明 |
|---|---------|--------|--------|------|
| 1 | [全局导航与面包屑](#feature-1-全局导航与面包屑) | P0 | 12 | 侧边栏、移动端抽屉、底部 Tab、面包屑 |
| 2 | [Dashboard — 今日工作台](#feature-2-dashboard--今日工作台) | P0 | 10 | 待办、心情打卡、打卡进度、动态、快捷入口 |
| 3 | [Profile — 成长档案总览](#feature-3-profile--成长档案总览) | P0 | 9 | 个人信息、五维雷达、时间线、评语、里程碑、活动 |
| 4 | [Space 拆分 — Mood + Assessments](#feature-4-space-拆分--mood--assessments) | P1 | 8 | 路由重定向、心情日记、心理测评独立 |
| 5 | [Scores — 学业成绩](#feature-5-scores--学业成绩) | P1 | 5 | 微调布局、统计卡片精简、学期筛选 |
| 6 | [Milestones — 里程碑](#feature-6-milestones--里程碑) | P1 | 4 | 状态筛选 Tab、导航适配 |
| 7 | [Activities — 活动记录](#feature-7-activities--活动记录) | P1 | 4 | 分类筛选 Tab、导航适配 |
| 8 | [Settings — 个人设置](#feature-8-settings--个人设置) | P1 | 6 | 账号信息、通知偏好、隐私设置 |
| 9 | [响应式布局](#feature-9-响应式布局) | P2 | 6 | 桌面端、平板、移动端断点适配 |
| 10 | [API 数据流与聚合接口](#feature-10-api-数据流与聚合接口) | P1 | 5 | 聚合 API、今日待办、心情统计 |
| 11 | [信息去重验证（全局）](#feature-11-信息去重验证全局) | P0 | 8 | 每个信息只在唯一页面出现 |

**总计：11 个 Feature，77 个 Scenario**

---

## Feature 1: 全局导航与面包屑

> **背景**：当前学生端所有页面零导航 UI，学生进入页面后无法切换。重构后所有页面共享统一侧边栏导航（桌面端）和底部 Tab 导航（移动端）。

### 场景 1.1: 侧边栏导航在所有学生端页面可见

```gherkin
Given 学生已登录并进入学生端任意页面（Dashboard / Profile / Scores / Assessments / Mood / Milestones / Activities / Semester Reports / Settings）
When 页面加载完成
Then 左侧应显示固定侧边栏导航
And 侧边栏宽度为 240px
And 侧边栏不随页面滚动而移动
And 侧边栏包含以下导航项：今日工作台、成长档案、学业成绩、心理测评、心情日记、里程碑、活动记录、学期报告
And 侧边栏底部包含：设置、退出登录、用户信息卡片（姓名、班级、等级、积分）
```

### 场景 1.2: 当前页面在导航中高亮

```gherkin
Given 学生已登录
And 学生当前位于 "/scores" 页面
When 页面加载完成
Then 侧边栏中"学业成绩"导航项应有高亮样式
And 高亮样式为：背景色 #f0f9ff + 左侧 3px 蓝色竖线
And 其他导航项无高亮样式
```

### 场景 1.3: 点击导航项跳转到对应页面

```gherkin
Given 学生已登录并位于 Dashboard 页面
When 学生点击侧边栏中的"成长档案"导航项
Then 页面应导航到 "/profile"
And 导航过程使用 Next.js 客户端路由（无整页刷新）
And 导航完成后侧边栏中"成长档案"导航项高亮
```

### 场景 1.4: 从任意页面可直达其他任意页面

```gherkin
Given 学生已登录并位于"/assessments"页面
When 学生点击侧边栏中的"心情日记"导航项
Then 页面应导航到 "/mood"
And 导航完成后侧边栏中"心情日记"导航项高亮
When 学生点击侧边栏中的"学期报告"导航项
Then 页面应导航到 "/semester-reports"
And 导航完成后侧边栏中"学期报告"导航项高亮
```

### 场景 1.5: 移动端汉堡菜单打开导航抽屉

```gherkin
Given 学生已登录
And 视口宽度小于 768px（移动端）
When 页面加载完成
Then 顶部应显示汉堡菜单按钮（☰）
When 学生点击汉堡菜单按钮
Then 应从左侧滑出全屏导航抽屉
And 抽屉中包含与桌面端相同的全部导航项
And 抽屉底部包含用户信息卡片
When 学生点击抽屉遮罩层或关闭按钮
Then 抽屉应平滑关闭
```

### 场景 1.6: 移动端底部 Tab 导航可见且可点击

```gherkin
Given 学生已登录
And 视口宽度小于 768px（移动端）
When 页面加载完成
Then 底部应显示固定 Tab 导航栏
And Tab 导航包含：首页、档案、成绩、更多
When 学生点击"档案"Tab
Then 页面应导航到 "/profile"
And "档案"Tab 应有激活状态样式
When 学生点击"更多"Tab
Then 应展开其余页面选项（心理测评、心情日记、里程碑、活动记录、学期报告、设置）
```

### 场景 1.7: 面包屑导航显示页面层级

```gherkin
Given 学生已登录并位于 "/scores" 页面
And 视口宽度大于等于 768px
When 页面加载完成
Then 页面标题上方应显示面包屑导航
And 面包屑内容为"首页 > 学业成绩"
And 面包屑字号为 14px
And 面包屑颜色为 #64748b
When 学生点击"首页"面包屑链接
Then 应导航到 "/dashboard"
```

### 场景 1.8: Dashboard 页面不显示面包屑

```gherkin
Given 学生已登录并位于 "/dashboard" 页面
When 页面加载完成
Then 页面标题上方不应显示面包屑导航
```

### 场景 1.9: 面包屑支持点击回退到上一级

```gherkin
Given 学生已登录并位于"/semester-reports"页面
When 页面加载完成
Then 面包屑应显示"首页 > 学期报告"
When 学生点击"首页"链接
Then 应导航到 "/dashboard"
```

### 场景 1.10: 平板端侧边栏可折叠为图标模式

```gherkin
Given 学生已登录
And 视口宽度在 768px 到 1023px 之间（平板端）
When 页面加载完成
Then 侧边栏应显示为可折叠模式
And 默认只显示导航图标和简短文字
And 侧边栏宽度小于桌面端
When 学生点击展开按钮
Then 侧边栏应展开为完整模式
```

### 场景 1.11: 导航抽屉动画流畅

```gherkin
Given 学生已登录
And 视口宽度小于 768px（移动端）
When 学生点击汉堡菜单按钮
Then 导航抽屉应在 300ms 内平滑滑入
And 应有半透明黑色遮罩层（opacity 0.5）
When 学生点击遮罩层
Then 抽屉应在 200ms 内平滑滑出
And 遮罩层同步淡出
```

### 场景 1.12: 侧边栏用户信息卡片显示正确

```gherkin
Given 学生张明已登录
And 张明是高一1班学生，等级 Lv.5，积分 320
When 页面加载完成
Then 侧边栏底部用户信息卡片应显示：
  | 字段 | 值 |
  | 姓名 | 张明 |
  | 班级 | 高一 · 1班 |
  | 等级积分 | Lv.5 · 320积分 |
```

---

## Feature 2: Dashboard — 今日工作台

> **背景**：当前 Dashboard 信息过载，包含五维雷达、成绩趋势、评语、里程碑、活动等 6 类信息。重构后 Dashboard 只保留"今日待办"、"心情打卡"、"打卡进度"、"最新动态"、"快捷入口"。

### 场景 2.1: Dashboard 不显示五维雷达

```gherkin
Given 学生已登录并位于 "/dashboard" 页面
When 页面加载完成
Then 页面不应包含五维雷达图表（RadarChart）
And 页面不应包含"五维成长"相关标题或描述
```

### 场景 2.2: Dashboard 不显示成绩趋势图

```gherkin
Given 学生已登录并位于 "/dashboard" 页面
When 页面加载完成
Then 页面不应包含成绩趋势折线图（LineChart）
And 页面不应包含"成绩趋势"相关标题
```

### 场景 2.3: Dashboard 不显示完整评语列表

```gherkin
Given 学生已登录并位于 "/dashboard" 页面
When 页面加载完成
Then 页面不应显示超过 1 条的教师评语
And 页面不应显示"教师评语"独立卡片
And 评语仅以摘要形式出现在"最新动态"区域
```

### 场景 2.4: Dashboard 显示今日待办列表

```gherkin
Given 学生张明已登录
And 张明今天尚未记录心情
And 张明本周尚未完成五维自评
And 张明有英语月考在 3 天后
When 张明访问 "/dashboard" 页面
Then 页面应显示"今日待办"区域
And 待办列表应包含：
  | 优先级 | 内容 |
  | high | 记录今日心情 |
  | medium | 完成五维自评（本周未打卡） |
  | medium | 英语月考复习提醒 |
And 每条待办前应显示复选框（☐）
```

### 场景 2.5: 今日待办自动生成规则

```gherkin
Given 学生已登录
When 系统计算今日待办时
Then 应检查以下条件并按优先级排序：
  | 条件 | 优先级 | 待办内容 |
  | 今日未记录心情 | high | 记录今日心情 |
  | 本周未完成五维自评 | medium | 完成五维自评 |
  | 3 天内有考试 | medium | {科目}月考复习提醒 |
And 已完成的条件不应出现在待办列表中
```

### 场景 2.6: Dashboard 显示今日心情打卡

```gherkin
Given 学生已登录并位于 "/dashboard" 页面
When 页面加载完成
Then 页面应显示"今日心情"区域
And 心情选项应包含：很低落、有些低落、一般、不错、非常好
And 每个选项应有对应的表情图标和颜色
And 心情选项下方应有文本输入框"写下今天的心情..."
And 应有"记录心情"按钮
```

### 场景 2.7: Dashboard 显示本周打卡进度

```gherkin
Given 学生张明已登录
And 张明本周已记录心情 5 天（目标 7 天）
And 张明本周未完成五维自评（目标 1 次）
And 张明本周已记录 2 个里程碑（目标 3 个）
When 张明访问 "/dashboard" 页面
Then 页面应显示"本周打卡进度"区域
And 打卡卡片应显示：
  | 打卡项 | 进度 | 状态 |
  | 心情日记 | 5/7 | ✅ |
  | 五维自评 | 0/1 | ⚠️ |
  | 里程碑 | 2/3 | ✅ |
```

### 场景 2.8: Dashboard 显示最新动态摘要

```gherkin
Given 学生已登录
And 系统中有 1 条最新教师评语、2 条最新里程碑、1 条最新成绩记录
When 学生访问 "/dashboard" 页面
Then 页面应显示"最新动态"区域
And 动态流应按时间倒序显示最近 3 条记录：
  | 时间 | 内容 | 类型 |
  | 2026-05-28 | 班主任李老师："张明这周数学竞赛准备..." | 评语 |
  | 2026-05-28 | 英语演讲比赛一等奖 | 里程碑 |
  | 2026-05-25 | 期中考试班级第 5 名 | 成绩 |
And 区域底部应有"查看全部"链接，点击跳转到 Profile 页面
```

### 场景 2.9: Dashboard 显示快捷入口网格

```gherkin
Given 学生已登录并位于 "/dashboard" 页面
When 页面加载完成
Then 页面应显示"快捷入口"区域
And 快捷入口应包含 4 个卡片：
  | 标题 | 描述 | 跳转目标 |
  | 心理测评 | 了解自己 | /assessments |
  | 记录心情 | 连续5天 | /mood |
  | 里程碑 | 记录成就 | /milestones |
  | 活动记录 | 课外成长 | /activities |
And 点击每个卡片应导航到对应页面
```

### 场景 2.10: Dashboard 页面宽度限制

```gherkin
Given 学生已登录并位于 "/dashboard" 页面
And 视口宽度大于等于 1024px（桌面端）
When 页面加载完成
Then 主内容区最大宽度应为 800px
And 内容应在主内容区内居中显示
```

---

## Feature 3: Profile — 成长档案总览

> **背景**：当前 Profile 与 Dashboard 大量重复，包含五维雷达、评语、里程碑、活动等。重构后 Profile 成为"完整档案总览"，去重后只显示独有的信息。

### 场景 3.1: Profile 显示完整五维成长雷达

```gherkin
Given 学生张明已登录
And 张明的五维分数为：学业 85、心理 72、职业 60、社交 88、特长 70
When 张明访问 "/profile" 页面
Then 页面应显示"五维成长雷达"区域
And 应显示完整的 RadarChart 图表
And 图表旁应显示各维度分数：
  | 维度 | 分数 |
  | 学业 | 85 |
  | 心理 | 72 |
  | 职业 | 60 |
  | 社交 | 88 |
  | 特长 | 70 |
And 应显示与班级平均对比
And 应显示优势维度：社交
And 应显示建议提升维度：职业
```

### 场景 3.2: Profile 不显示今日待办

```gherkin
Given 学生已登录并位于 "/profile" 页面
When 页面加载完成
Then 页面不应包含"今日待办"区域
And 页面不应包含待办列表或复选框
```

### 场景 3.3: Profile 不显示心情打卡

```gherkin
Given 学生已登录并位于 "/profile" 页面
When 页面加载完成
Then 页面不应包含"今日心情"记录区域
And 页面不应包含心情选项按钮（很低落/有些低落/一般/不错/非常好）
```

### 场景 3.4: Profile 显示成长时间线

```gherkin
Given 学生张明已登录
And 张明有以下成长记录（按时间倒序）：
  | 日期 | 内容 | 类型 |
  | 2026-05-28 | 英语演讲比赛一等奖 | 里程碑 |
  | 2026-05-25 | 期中考试班级第 5 名 | 成绩 |
  | 2026-05-20 | "张明这周表现..." · 班主任李老师 | 评语 |
  | 2026-05-15 | 加入机器人社团 | 活动 |
When 张明访问 "/profile" 页面
Then 页面应显示"成长时间线"区域
And 时间线应按时间倒序纵向排列
And 每条记录应显示日期、内容和类型标签
And 时间线应支持按类型筛选：全部、成绩、评语、里程碑、活动
```

### 场景 3.5: Profile 显示全部教师评语

```gherkin
Given 学生张明已登录
And 张明有 12 条教师评语
When 张明访问 "/profile" 页面
Then 页面应显示"教师评语"区域
And 应显示全部 12 条评语（或分页展示）
And 每条评语应显示：评语内容、教师姓名、日期
And 不应只显示摘要或最近 2 条
```

### 场景 3.6: Profile 显示全部里程碑

```gherkin
Given 学生张明已登录
And 张明有 8 个里程碑
When 张明访问 "/profile" 页面
Then 页面应显示"里程碑"区域
And 应显示全部 8 个里程碑
And 不应与 Dashboard 中的里程碑摘要重复
```

### 场景 3.7: Profile 显示全部活动记录

```gherkin
Given 学生张明已登录
And 张明有 15 项活动记录
When 张明访问 "/profile" 页面
Then 页面应显示"活动记录"区域
And 应显示全部 15 项活动记录
```

### 场景 3.8: Profile 底部显示综合统计

```gherkin
Given 学生张明已登录
When 张明访问 "/profile" 页面
Then 页面底部应显示"综合统计"区域
And 统计应包含：
  | 统计项 | 值 |
  | 考试记录 | 24 |
  | 教师评语 | 12 |
  | 里程碑 | 8 |
  | 活动积分 | 320 |
  | 心情记录 | 45 |
  | 测评 | 3 |
And 不应在页面顶部显示重复的数字卡片统计
```

### 场景 3.9: Profile 页面使用聚合 API

```gherkin
Given 学生已登录并位于 "/profile" 页面
When 页面加载数据时
Then 应只调用一个聚合接口 GET /api/students/me/profile
And 不应并行调用 /api/comments、/api/milestones、/api/activities、/api/scores 等多个独立接口
And 页面加载时间应小于 2 秒
```

---

## Feature 4: Space 拆分 — Mood + Assessments

> **背景**：当前 `/space` 页面同时包含心理测评和心情日记，功能边界模糊。重构后拆分为独立的 `/mood`（心情日记）和 `/assessments`（心理测评），旧 `/space` 路由重定向到 `/mood`。

### 场景 4.1: 旧路由 /space 重定向到 /mood

```gherkin
Given 学生已登录
When 学生访问 "/space" 路由
Then 应自动重定向到 "/mood"（HTTP 302 或 Next.js 客户端重定向）
And URL 应更新为 "/mood"
And 页面应显示心情日记内容
```

### 场景 4.2: Mood 页面不显示心理测评

```gherkin
Given 学生已登录并位于 "/mood" 页面
When 页面加载完成
Then 页面不应包含心理测评量表列表
And 页面不应包含"心理测评"相关标题或入口
And 页面不应包含 AssessmentPlayer 组件
```

### 场景 4.3: Mood 页面显示今日心情记录

```gherkin
Given 学生已登录并位于 "/mood" 页面
When 页面加载完成
Then 页面应显示"今日心情"区域
And 心情选项应包含：很低落、有些低落、一般、不错、非常好
And 应有文本输入框和"记录心情"按钮
And 功能与 Dashboard 中的心情打卡一致
```

### 场景 4.4: Mood 页面显示心情日历热力图

```gherkin
Given 学生已登录并位于 "/mood" 页面
And 学生本月已记录 15 天心情
When 页面加载完成
Then 页面应显示"心情日历"区域
And 日历应以 GitHub Contribution Graph 风格展示
And 每一天应有颜色深浅表示心情等级（越深表示心情越好）
And 未记录的日期应为空白或灰色
```

### 场景 4.5: Mood 页面显示近 30 天心情趋势

```gherkin
Given 学生已登录并位于 "/mood" 页面
And 学生近 30 天有心情记录
When 页面加载完成
Then 页面应显示"近 30 天心情趋势"区域
And 应显示折线图（LineChart）展示心情变化
And X 轴为日期，Y 轴为心情等级（1-5）
```

### 场景 4.6: Mood 页面显示心情统计

```gherkin
Given 学生已登录并位于 "/mood" 页面
And 学生本月心情数据：平均 3.5、最高 5、最低 1、积极天数 12、低落天数 3、连续记录 5 天
When 页面加载完成
Then 页面应显示"心情统计"区域
And 应显示：
  | 统计项 | 值 |
  | 本月平均 | 3.5 |
  | 最高 | 5 |
  | 最低 | 1 |
  | 积极天数 | 12 |
  | 低落天数 | 3 |
  | 连续记录 | 5 天 🔥 |
```

### 场景 4.7: Assessments 页面不显示心情记录

```gherkin
Given 学生已登录并位于 "/assessments" 页面
When 页面加载完成
Then 页面不应包含"今日心情"记录区域
And 页面不应包含心情选项按钮
And 页面不应包含心情日历或心情趋势图表
```

### 场景 4.8: Assessments 页面只显示测评相关功能

```gherkin
Given 学生已登录并位于 "/assessments" 页面
When 页面加载完成
Then 页面应显示"测评概览"区域
And 应显示已完成测评数 / 总量表数
And 应显示量表列表卡片网格
And 每个量表卡片应显示：名称、类型（心理/职业/性格）、题目数、预计时长、完成状态
And 页面底部应显示"历史测评结果"区域
And 历史结果应显示：量表名称、得分、风险等级、完成日期
```

---

## Feature 5: Scores — 学业成绩

> **背景**：Scores 页面结构相对清晰，主要微调统计卡片与布局适配。

### 场景 5.1: Scores 统计卡片精简

```gherkin
Given 学生已登录并位于 "/scores" 页面
When 页面加载完成
Then 统计卡片区域应只显示：考试科目数、平均得分率
And 不应显示"最高分"和"考试记录数"统计卡片
And "最高分"和"考试记录数"应移到页面底部或明细区域
```

### 场景 5.2: Scores 显示学科均衡雷达

```gherkin
Given 学生已登录并位于 "/scores" 页面
When 页面加载完成
Then 页面应显示"学科均衡雷达"图表
And 雷达图应展示各学科得分分布
```

### 场景 5.3: Scores 显示成绩明细表

```gherkin
Given 学生已登录并位于 "/scores" 页面
When 页面加载完成
Then 页面应显示"成绩明细"表格
And 表格应包含列：考试名称、科目、得分、满分、得分率、日期
And 表格应支持学期筛选
```

### 场景 5.4: Scores 成绩明细表支持学期筛选

```gherkin
Given 学生已登录并位于 "/scores" 页面
When 页面加载完成
Then 成绩明细表上方应有"学期筛选"下拉框
And 下拉框应包含选项：全部、2025-2026 第一学期、2025-2026 第二学期
When 学生选择"2025-2026 第一学期"
Then 表格应只显示该学期的成绩记录
```

### 场景 5.5: Scores 适配新导航布局

```gherkin
Given 学生已登录并位于 "/scores" 页面
And 视口宽度大于等于 1024px
When 页面加载完成
Then 左侧应显示侧边栏导航
And 主内容区应有合适的左边距（240px）
And 页面标题应为"学业成绩"
And 副标题应为"成绩详情、趋势分析与学科均衡度"
```

---

## Feature 6: Milestones — 里程碑

> **背景**：保持现状，增加状态筛选 Tab，适配新导航。

### 场景 6.1: Milestones 显示状态筛选 Tab

```gherkin
Given 学生已登录并位于 "/milestones" 页面
When 页面加载完成
Then 页面应显示状态筛选 Tab：全部、已通过、待审核、已拒绝
And 默认选中"全部"
When 学生点击"已通过"Tab
Then 列表应只显示状态为"APPROVED"的里程碑
When 学生点击"待审核"Tab
Then 列表应只显示状态为"PENDING"的里程碑
When 学生点击"已拒绝"Tab
Then 列表应只显示状态为"REJECTED"的里程碑
```

### 场景 6.2: Milestones 申报按钮可用

```gherkin
Given 学生已登录并位于 "/milestones" 页面
When 页面加载完成
Then 页面右上角应有"申报里程碑"按钮
When 学生点击按钮
Then 应弹出申报表单对话框
And 表单应包含：标题、类型、发生日期、描述
```

### 场景 6.3: Milestones 适配新导航布局

```gherkin
Given 学生已登录并位于 "/milestones" 页面
When 页面加载完成
Then 左侧应显示侧边栏导航
And 当前页面"里程碑"应在导航中高亮
```

### 场景 6.4: Milestones 列表显示状态标签

```gherkin
Given 学生已登录
And 学生有以下里程碑：
  | 标题 | 状态 |
  | 英语演讲比赛一等奖 | APPROVED |
  | 数学竞赛报名 | PENDING |
When 学生访问 "/milestones" 页面
Then 每个里程碑应显示对应的状态标签
And "已通过"应显示为绿色
And "待审核"应显示为黄色
And "已拒绝"应显示为红色
```

---

## Feature 7: Activities — 活动记录

> **背景**：保持现状，增加分类筛选 Tab，适配新导航。

### 场景 7.1: Activities 显示分类筛选 Tab

```gherkin
Given 学生已登录并位于 "/activities" 页面
When 页面加载完成
Then 页面应显示分类筛选 Tab：全部、学业、活动、比赛、心理、个人、成长
And 默认选中"全部"
When 学生点击"比赛"Tab
Then 列表应只显示类型为"COMPETITION"的活动
```

### 场景 7.2: Activities 显示积分统计

```gherkin
Given 学生已登录并位于 "/activities" 页面
When 页面加载完成
Then 页面应显示积分统计区域
And 应显示总积分和各类别积分分布
```

### 场景 7.3: Activities 适配新导航布局

```gherkin
Given 学生已登录并位于 "/activities" 页面
When 页面加载完成
Then 左侧应显示侧边栏导航
And 当前页面"活动记录"应在导航中高亮
```

### 场景 7.4: Activities 列表显示分类标签

```gherkin
Given 学生已登录
And 学生有以下活动：
  | 标题 | 类型 |
  | 加入机器人社团 | ACTIVITY |
  | 英语演讲比赛 | COMPETITION |
When 学生访问 "/activities" 页面
Then 每个活动应显示对应的分类标签
```

---

## Feature 8: Settings — 个人设置

> **背景**：新增页面，包含账号信息、通知偏好、隐私设置。

### 场景 8.1: Settings 页面可访问

```gherkin
Given 学生已登录
When 学生通过侧边栏导航点击"设置"
Then 应导航到 "/settings" 页面
And 页面应正常加载，无 404 错误
```

### 场景 8.2: Settings 显示账号信息

```gherkin
Given 学生张明已登录
And 张明邮箱为 zhangming@example.com
When 张明访问 "/settings" 页面
Then 页面应显示"账号信息"区域
And 应显示：
  | 字段 | 值 | 可编辑 |
  | 姓名 | 张明 | 否 |
  | 学号 | 20280101 | 否 |
  | 邮箱 | zhangming@example.com | 是 |
And 应有"修改密码"按钮
```

### 场景 8.3: Settings 显示通知偏好

```gherkin
Given 学生已登录并位于 "/settings" 页面
When 页面加载完成
Then 页面应显示"通知偏好"区域
And 应包含以下复选框（默认状态可配置）：
  | 通知项 | 默认状态 |
  | 教师新评语通知 | 开启 |
  | 里程碑审核结果通知 | 开启 |
  | 每周成长简报通知 | 开启 |
  | 系统公告通知 | 开启 |
When 学生取消勾选"系统公告通知"
Then 该通知项应变为关闭状态
And 设置应保存到后端
```

### 场景 8.4: Settings 显示隐私设置

```gherkin
Given 学生已登录并位于 "/settings" 页面
When 页面加载完成
Then 页面应显示"隐私设置"区域
And 应包含以下复选框：
  | 隐私项 | 默认状态 |
  | 允许同学查看我的五维雷达（脱敏） | 关闭 |
  | 允许同学查看我的里程碑 | 关闭 |
  | 允许家长查看我的评语 | 开启 |
```

### 场景 8.5: Settings 保存设置成功

```gherkin
Given 学生已登录并位于 "/settings" 页面
When 学生修改邮箱为 "zhangming-new@example.com"
And 学生开启"允许同学查看我的里程碑"
And 学生点击"保存设置"按钮
Then 应显示保存成功提示
And 邮箱应更新为 "zhangming-new@example.com"
And 隐私设置应同步更新
```

### 场景 8.6: Settings 适配新导航布局

```gherkin
Given 学生已登录并位于 "/settings" 页面
When 页面加载完成
Then 左侧应显示侧边栏导航
And 当前页面"设置"应在导航中高亮
And 面包屑应显示"首页 > 个人设置"
```

---

## Feature 9: 响应式布局

> **背景**：支持桌面端（≥1024px）、平板端（768px~1023px）、移动端（<768px）三种布局。

### 场景 9.1: 桌面端显示完整侧边栏

```gherkin
Given 学生已登录
And 视口宽度为 1280px
When 页面加载完成
Then 左侧应显示完整侧边栏导航（240px 宽度）
And 导航项应同时显示图标和文字
And 主内容区应有左边距 240px
And 不应显示汉堡菜单按钮
And 不应显示底部 Tab 导航
```

### 场景 9.2: 平板端显示可折叠侧边栏

```gherkin
Given 学生已登录
And 视口宽度为 900px
When 页面加载完成
Then 左侧应显示可折叠侧边栏
And 默认状态只显示图标和简短文字
And 侧边栏宽度应小于 240px
And 应有展开/折叠按钮
```

### 场景 9.3: 移动端显示汉堡菜单和底部 Tab

```gherkin
Given 学生已登录
And 视口宽度为 375px
When 页面加载完成
Then 顶部应显示汉堡菜单按钮
And 底部应显示 Tab 导航栏
And 左侧不应显示固定侧边栏
And 主内容区左边距应为 0
```

### 场景 9.4: 窗口尺寸变化时布局自适应

```gherkin
Given 学生已登录
And 当前视口宽度为 1280px（桌面端）
When 用户将窗口宽度调整为 800px（平板端）
Then 侧边栏应在 300ms 内平滑过渡为可折叠模式
And 布局不应出现闪烁或错位
When 用户将窗口宽度调整为 375px（移动端）
Then 侧边栏应隐藏
And 汉堡菜单和底部 Tab 应在 300ms 内出现
```

### 场景 9.5: 移动端导航抽屉全屏覆盖

```gherkin
Given 学生已登录
And 视口宽度为 375px
When 学生点击汉堡菜单按钮
Then 导航抽屉应从左侧滑出
And 抽屉宽度应为 100%（全屏覆盖）
And 应有半透明黑色遮罩层
And 抽屉内容应包含全部导航项
```

### 场景 9.6: 移动端底部 Tab 固定不滚动

```gherkin
Given 学生已登录
And 视口宽度为 375px
When 学生滚动页面内容
Then 底部 Tab 导航应固定在视口底部
And Tab 导航不应随页面滚动而移动
And Tab 导航应有半透明背景或边框分隔
```

---

## Feature 10: API 数据流与聚合接口

> **背景**：删除冗余 API 调用，新增聚合接口减少并行请求。

### 场景 10.1: Profile 使用聚合 API

```gherkin
Given 学生已登录并访问 "/profile" 页面
When 页面加载数据时
Then 应发送 GET 请求到 /api/students/me/profile
And 响应应包含以下字段：
  | 字段 | 类型 | 说明 |
  | student | Object | 学生基本信息 |
  | fiveDimensions | Object | 五维雷达数据 |
  | comments | Array | 全部教师评语 |
  | milestones | Array | 全部里程碑 |
  | activities | Array | 全部活动记录 |
  | scoreSummary | Object | 成绩摘要（科目数、平均分） |
And 不应发送并行请求到 /api/comments、/api/milestones、/api/activities、/api/scores
```

### 场景 10.2: Dashboard 精简 API 调用

```gherkin
Given 学生已登录并访问 "/dashboard" 页面
When 页面加载数据时
Then 应发送以下请求：
  | API | 说明 |
  | GET /api/students/me | 学生基本信息 + 今日心情状态 |
  | GET /api/mood | 本周心情记录 |
  | GET /api/milestones?limit=3 | 最新 3 条里程碑 |
  | GET /api/comments?limit=1 | 最新 1 条评语 |
And 不应请求 /api/scores 或完整的五维雷达数据
```

### 场景 10.3: 今日待办 API 返回正确数据

```gherkin
Given 学生张明已登录
And 张明今天未记录心情
And 张明本周未完成五维自评
When 前端发送 GET /api/students/me/todos
Then 响应状态码应为 200
And 响应体应为：
  """
  {
    "todos": [
      { "id": "mood", "text": "记录今日心情", "priority": "high", "completed": false },
      { "id": "assessment", "text": "完成五维自评（本周未打卡）", "priority": "medium", "completed": false }
    ]
  }
  """
```

### 场景 10.4: 心情统计 API 返回正确数据

```gherkin
Given 学生已登录
When 前端发送 GET /api/mood/stats
Then 响应状态码应为 200
And 响应体应包含：
  | 字段 | 类型 | 说明 |
  | monthlyAverage | Number | 本月平均心情（1-5） |
  | highest | Number | 本月最高心情 |
  | lowest | Number | 本月最低心情 |
  | positiveDays | Number | 积极天数（心情≥4） |
  | lowDays | Number | 低落天数（心情≤2） |
  | streakDays | Number | 连续记录天数 |
```

### 场景 10.5: 聚合 API 响应时间小于 2 秒

```gherkin
Given 学生已登录
When 前端发送 GET /api/students/me/profile
Then 从请求发送到响应完成的总时间应小于 2000ms
And 响应状态码应为 200
And 响应体应包含完整档案数据
```

---

## Feature 11: 信息去重验证（全局）

> **背景**：核心原则 — "一个信息只出现在一个页面"。此 Feature 作为全局验收，确保信息不重复。

### 场景 11.1: 五维雷达只出现在 Profile

```gherkin
Given 学生已登录
When 学生依次访问以下页面：/dashboard、/scores、/assessments、/mood、/milestones、/activities、/semester-reports、/settings
Then 这些页面均不应包含完整的五维雷达图表（RadarChart）
And 只有 /profile 页面包含完整的五维雷达图表
And Dashboard 可显示五维分数卡片（无图表）
```

### 场景 11.2: 完整评语列表只出现在 Profile

```gherkin
Given 学生已登录
And 学生有超过 2 条教师评语
When 学生访问 "/dashboard" 页面
Then 页面不应显示超过 1 条的评语
When 学生访问 "/profile" 页面
Then 页面应显示全部评语（或分页展示全部）
When 学生访问其他页面
Then 页面不应显示评语列表
```

### 场景 11.3: 完整里程碑列表只出现在 Profile

```gherkin
Given 学生已登录
And 学生有超过 3 个里程碑
When 学生访问 "/dashboard" 页面
Then 页面不应显示超过 3 条的里程碑列表
When 学生访问 "/profile" 页面
Then 页面应显示全部里程碑
When 学生访问其他页面（除 /milestones）
Then 页面不应显示里程碑列表
```

### 场景 11.4: 心情记录功能只出现在 Dashboard 和 Mood

```gherkin
Given 学生已登录
When 学生访问 "/dashboard" 页面
Then 页面应显示今日心情打卡区域
When 学生访问 "/mood" 页面
Then 页面应显示完整的心情记录、日历、趋势、统计
When 学生访问其他页面（/profile、/scores、/assessments 等）
Then 页面不应显示心情记录功能
```

### 场景 11.5: 心理测评只出现在 Assessments

```gherkin
Given 学生已登录
When 学生访问 "/assessments" 页面
Then 页面应显示量表列表和历史结果
When 学生访问 "/mood" 页面
Then 页面不应显示心理测评入口
When 学生访问其他页面
Then 页面不应显示心理测评功能
```

### 场景 11.6: 成绩趋势图只出现在 Scores

```gherkin
Given 学生已登录
When 学生访问 "/scores" 页面
Then 页面应显示成绩趋势图
When 学生访问 "/dashboard" 或 "/profile" 页面
Then 页面不应显示成绩趋势图
```

### 场景 11.7: 今日待办只出现在 Dashboard

```gherkin
Given 学生已登录
When 学生访问 "/dashboard" 页面
Then 页面应显示今日待办列表
When 学生访问其他任意页面
Then 页面不应显示今日待办列表
```

### 场景 11.8: 每个页面有唯一页面标题和副标题

```gherkin
Given 学生已登录
When 学生依次访问所有学生端页面
Then 每个页面应有唯一的 <h1> 标题和 <p> 副标题：
  | 页面 | 标题 | 副标题 |
  | /dashboard | 今日工作台 | 查看今日待办与成长打卡 |
  | /profile | 成长档案 | 张明 · 高一1班 · 2028级 |
  | /scores | 学业成绩 | 成绩详情、趋势分析与学科均衡度 |
  | /assessments | 心理测评 | 了解自我，探索心理与职业方向 |
  | /mood | 心情日记 | 记录心情，关注心理健康 |
  | /milestones | 里程碑 | 记录成长中的重要时刻 |
  | /activities | 活动记录 | 课外活动与积分统计 |
  | /semester-reports | 学期报告 | 学期成长总结与教师评语 |
  | /settings | 个人设置 | 账号、通知与隐私偏好 |
```

---

## 附录 A：端到端集成场景

### E2E 场景 1: 学生一天的典型使用流程

```gherkin
Feature: 学生一天的典型使用流程

Scenario: 张明登录后查看今日待办并完成心情打卡
  Given 学生张明已登录
  When 张明打开系统首页（/dashboard）
  Then 页面应显示今日待办："记录今日心情"（高优先级）
  When 张明在 Dashboard 选择心情"不错"并点击"记录心情"
  Then 心情记录应保存成功
  And Dashboard 今日待办中"记录今日心情"应标记为已完成
  When 张明点击侧边栏"成长档案"
  Then 应导航到 Profile 页面
  And 成长时间线应显示刚记录的心情事件
  When 张明点击侧边栏"心情日记"
  Then 应导航到 Mood 页面
  And 心情日历中今天应显示"不错"对应的颜色
  When 张明点击侧边栏"学业成绩"
  Then 应导航到 Scores 页面
  And 页面应显示成绩明细和趋势分析
```

### E2E 场景 2: 信息去重全局验证流程

```gherkin
Feature: 信息去重全局验证流程

Scenario: 验证关键信息只在唯一页面出现
  Given 测试人员已登录学生端
  When 测试人员依次访问所有 9 个学生端页面
  And 在每个页面检查以下信息是否存在：
    | 信息类型 | 期望唯一页面 |
    | 五维雷达图表 | /profile |
    | 完整评语列表（>2条） | /profile |
    | 完整里程碑列表（>3条） | /profile |
    | 成绩趋势图 | /scores |
    | 量表列表 | /assessments |
    | 心情日历热力图 | /mood |
    | 今日待办 | /dashboard |
    | 快捷入口网格 | /dashboard |
  Then 每个信息类型应只在其期望的唯一页面出现
  And 不应在其他任何页面出现
```

---

## 附录 B：测试优先级与执行建议

| 优先级 | Feature | 建议执行方式 | 预计时间 |
|--------|---------|-------------|----------|
| **P0（必须先过）** | Feature 1 全局导航 | 手动 + E2E | 2h |
| **P0** | Feature 2 Dashboard | 手动 + 单元 | 1.5h |
| **P0** | Feature 3 Profile | 手动 + 单元 | 1.5h |
| **P0** | Feature 11 信息去重 | 手动遍历 | 1h |
| **P1** | Feature 4 Space 拆分 | 手动 + 单元 | 1h |
| **P1** | Feature 5 Scores | 手动 | 0.5h |
| **P1** | Feature 6 Milestones | 手动 | 0.5h |
| **P1** | Feature 7 Activities | 手动 | 0.5h |
| **P1** | Feature 8 Settings | 手动 + 单元 | 1h |
| **P1** | Feature 10 API | 单元 + 集成 | 1h |
| **P2** | Feature 9 响应式 | 手动（多设备） | 1h |

**总验收时间：约 10~11 小时**

---

*新府学 BizSim Edu · 学生端信息架构重构 BDD · 2026-06-01*
