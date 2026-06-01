# PRD：五维雷达图数学算法重构

> **文档状态**：设计稿  
> **目标版本**：v2.0  
> **关联模块**：学生端 Dashboard、Profile、Space / 管理端 Reports / API  
> **核心原则**：自比导向 · 保底增长 · 真实波动 · 插班友好

---

## 一、背景与问题

当前系统的五维雷达图存在以下问题：

1. **分数来源不透明**：`seed.ts` 中硬编码或随机生成，学生看不到分数怎么来的
2. **他比导向**：默认显示"班级平均"对比线，容易制造焦虑、引发攀比
3. **无历史轨迹**：`dimensionHistory` 为空数组，无法看到成长变化
4. **插班生无感**：入学即面对一个已经有历史数据的同学群体，找不到自己的起点
5. **停滞无反馈**：长期不参与某维度的活动，分数不会变化，学生意识不到问题

本 PRD 设计一套**自比导向的五维数学算法**，让每个学生看到的是**"自己的进步曲线"**。

---

## 二、核心设计理念

### 2.1 双轨得分模型

每个维度的**显示分 = 基础分(Base) + 成长分(Growth)**

```
┌─────────────────────────────────────────┐
│           显示分 (0~100)                 │
│  ┌─────────────────────────────────┐    │
│  │      基础分 (Base) 0~60          │    │ ← 保底，随在校时间线性增长
│  │  ┌─────────────────────────┐    │    │
│  │  │   成长分 (Growth) 0~40   │    │    │ ← 真实表现，有波动、可停滞、可倒退
│  │  └─────────────────────────┘    │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

| 分值段 | 含义 |
|--------|------|
| **基础分 0~60** | 只要正常在校参与，就会自然增长。让学生感受到"我在学校的日子没有白费" |
| **成长分 0~40** | 反映真实的努力、表现和投入。做得好不骗人，做得差也能看出来 |

### 2.2 自比替代他比

| 对比方式 | 旧版 | 新版 |
|----------|------|------|
| 对比对象 | 班级平均（他比） | 自己上学期（自比） |
| 雷达图 | 个人 + 班级平均两条线 | 当前学期 + 上学期两条线 |
| 变化指示 | 无 | 每维度旁显示 ↑ ↓ → 环比变化 |
| 维度评价 | 无 | 优秀/良好/一般/需关注 四级标签 |

### 2.3 停滞与倒退必须可见

引入**衰减机制**：某维度连续两个学期无有效数据输入时：
- 成长分按衰减系数下降（各维度不同）
- 基础分继续增长，但增长幅度追不上衰减
- **结果：总分可能持平甚至下降**，学生必须正视

---

## 三、五维定义与数据来源

| 维度 | 数据来源 | 权重分配 |
|------|----------|----------|
| **学业** | `Score` 考试成绩表 | 得分率 × 40 |
| **心理** | `Assessment` 心理测评 + `MoodEntry` 心情日记 | 测评 30% + 心情记录 30% + 参与度 40% |
| **职业** | `Assessment` 职业测评 + `CareerProfile.goals` 目标完成 | 测评完成 40% + 目标完成 40% + 参与度 20% |
| **社交** | `Activity` 活动参与 + `Comment` 教师评语社交标签 | 活动 40% + 评语 30% + 参与度 30% |
| **特长** | `Milestone` 里程碑 + `Activity` 获奖成果 | 里程碑 40% + 成果 30% + 参与度 30% |

> **参与度**：指该维度是否有"主动行为记录"（如打开测评页面、记录心情、查看职业规划等），是最低门槛的鼓励指标。

---

## 四、数学算法详解

### 4.1 基础分算法 BaseScore

```typescript
/**
 * 计算某维度基础分
 * @param enrollmentSemester  入学学期标识，如 "2024-2025-1"
 * @param currentSemester     当前学期标识
 * @param isTransferStudent   是否为插班生
 * @returns 基础分 (0~60)
 */
function calculateBaseScore(
  enrollmentSemester: string,
  currentSemester: string,
  isTransferStudent: boolean = false
): number {
  const SEMESTER_INCREMENT = 3.5;        // 普通生每学期基础分增长
  const TRANSFER_INCREMENT = 5.0;        // 插班生前两个学期加速增长
  const BASELINE = 40;                   // 入学基准分
  const CAP = 60;                        // 基础分封顶

  const semestersPassed = countSemesters(enrollmentSemester, currentSemester);

  if (isTransferStudent && semestersPassed <= 2) {
    // 插班生观察期：前两个学期加速
    return Math.min(CAP, BASELINE + semestersPassed * TRANSFER_INCREMENT);
  }

  return Math.min(CAP, BASELINE + semestersPassed * SEMESTER_INCREMENT);
}
```

**关键参数说明**：

| 参数 | 值 | 理由 |
|------|-----|------|
| 入学基准分 | 40 | 新生入学不是从0开始，给人"已经有一些基础"的正向暗示 |
| 每学期增长 | 3.5 | 约5~6个学期达到封顶（初中/高中正好覆盖），每年约+7分 |
| 插班生加速 | 5.0 | 前两个学期额外关注，帮助快速建立归属感 |
| 封顶 | 60 | 基础分最多占60%，成长分最少占40%，避免"躺平也能高分" |

### 4.2 学业维度成长分

```typescript
/**
 * 学业成长分：0~40
 * 基于最近一学期考试成绩的加权得分率
 */
function calculateAcademicGrowth(
  scores: Score[],          // 该学生全部成绩记录
  currentSemester: string
): number {
  const semesterScores = scores.filter(s => s.semester === currentSemester);

  if (semesterScores.length === 0) {
    // 本学期无考试：继承上学期成长分 × 衰减系数 0.9
    return inheritWithDecay(scores, currentSemester, 0.9);
  }

  // 按科目分组，每科取最新一次考试
  const bySubject: Record<string, Score> = {};
  for (const s of semesterScores) {
    if (!bySubject[s.subject] || s.examDate > bySubject[s.subject].examDate) {
      bySubject[s.subject] = s;
    }
  }

  // 计算加权平均得分率
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [subject, score] of Object.entries(bySubject)) {
    const rate = score.score / (score.total || 100);
    // 期末考权重2，期中权重1.5，月考权重1
    const weight = score.examType === "FINAL" ? 2
                 : score.examType === "MIDTERM" ? 1.5
                 : 1;
    weightedSum += rate * weight;
    totalWeight += weight;
  }

  const avgRate = weightedSum / totalWeight;
  return Math.round(avgRate * 40);  // 得分率 × 40 = 成长分
}
```

### 4.3 心理维度成长分

```typescript
/**
 * 心理成长分：0~40
 * 基于心理测评结果 + 心情日记连续性 + 主动参与度
 */
function calculatePsychGrowth(
  assessments: Assessment[],    // 心理测评记录
  moodEntries: MoodEntry[],     // 心情日记
  currentSemester: string
): number {
  // 1. 心理测评得分 (0~12分)
  const psychAssessments = assessments.filter(
    a => a.scaleCode === "MHT" || a.scaleCode === "SCL90" // 心理健康相关量表
  );
  const latestPsych = psychAssessments
    .filter(a => a.semester === currentSemester)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  const psychScore = latestPsych
    ? Math.min(12, Math.round((latestPsych.score || 50) / 100 * 12))
    : inheritWithDecay(psychAssessments, currentSemester, 0.85) * (12/40);

  // 2. 心情日记连续性 (0~12分)
  const semesterMoods = moodEntries.filter(m => {
    const mSem = getSemesterFromDate(m.date);
    return mSem === currentSemester;
  });

  let moodScore = 0;
  if (semesterMoods.length >= 30) moodScore = 12;
  else if (semesterMoods.length >= 14) moodScore = 9;
  else if (semesterMoods.length >= 7) moodScore = 6;
  else if (semesterMoods.length >= 3) moodScore = 3;
  else moodScore = Math.round(semesterMoods.length); // 1~2次 = 1~2分

  // 连续记录额外奖励
  const streak = calculateMoodStreak(moodEntries);
  if (streak >= 30) moodScore += 4;
  else if (streak >= 14) moodScore += 2;

  // 3. 主动参与度 (0~12分) — 本学期是否主动打开过心理相关页面
  const engagementScore = 8; // TODO: 通过行为日志计算，默认给参与分

  return Math.min(40, psychScore + moodScore + engagementScore);
}
```

### 4.4 职业维度成长分

```typescript
/**
 * 职业成长分：0~40
 * 基于职业测评完成度 + 目标设定与完成 + 主动参与度
 */
function calculateCareerGrowth(
  assessments: Assessment[],      // 职业测评记录
  careerProfile: CareerProfile,   // 生涯档案
  currentSemester: string
): number {
  // 1. 职业测评完成度 (0~16分)
  const careerAssessments = assessments.filter(
    a => a.scaleCode === "HOLLAND" || a.scaleCode === "MBTI"
  );
  const hasHolland = careerAssessments.some(a => a.scaleCode === "HOLLAND");
  const hasMBTI = careerAssessments.some(a => a.scaleCode === "MBTI");

  const assessmentScore = (hasHolland ? 8 : 0) + (hasMBTI ? 8 : 0);

  // 2. 目标完成度 (0~16分)
  let goalScore = 0;
  if (careerProfile?.goals) {
    const goals = JSON.parse(careerProfile.goals) as Goal[];
    const semesterGoals = goals.filter(g => g.semester === currentSemester);
    if (semesterGoals.length > 0) {
      const completed = semesterGoals.filter(g => g.completed).length;
      goalScore = Math.round((completed / semesterGoals.length) * 16);
    }
  }

  // 3. 主动参与度 (0~8分)
  const engagementScore = careerAssessments.length > 0 ? 8 : 4;

  return Math.min(40, assessmentScore + goalScore + engagementScore);
}
```

### 4.5 社交维度成长分

```typescript
/**
 * 社交成长分：0~40
 * 基于活动参与 + 教师评语社交标签 + 主动参与度
 */
function calculateSocialGrowth(
  activities: Activity[],       // 活动记录
  comments: Comment[],          // 教师评语
  currentSemester: string
): number {
  // 1. 活动参与 (0~16分)
  const semesterActivities = activities.filter(a => {
    const aSem = getSemesterFromDate(a.startDate);
    return aSem === currentSemester;
  });

  const activityScore = Math.min(16, semesterActivities.length * 3);

  // 2. 教师评语社交标签 (0~12分)
  const socialComments = comments.filter(c => {
    const cSem = getSemesterFromDate(c.createdAt);
    return cSem === currentSemester && hasSocialTag(c.dimensions);
  });

  const commentScore = Math.min(12, socialComments.length * 2);

  // 3. 主动参与度 (0~12分)
  const engagementScore = semesterActivities.length > 0 ? 12 : 6;

  return Math.min(40, activityScore + commentScore + engagementScore);
}
```

### 4.6 特长维度成长分

```typescript
/**
 * 特长成长分：0~40
 * 基于里程碑 + 获奖/成果 + 主动参与度
 */
function calculateTalentGrowth(
  milestones: Milestone[],      // 里程碑
  activities: Activity[],       // 活动（含获奖）
  currentSemester: string
): number {
  // 1. 里程碑 (0~16分)
  const semesterMilestones = milestones.filter(m => {
    const mSem = getSemesterFromDate(m.occurredAt);
    return mSem === currentSemester;
  });

  const milestoneScore = Math.min(16, semesterMilestones.length * 4);

  // 2. 获奖/成果 (0~12分)
  const awards = activities.filter(a => {
    const aSem = getSemesterFromDate(a.startDate);
    return aSem === currentSemester && a.result && a.result.includes("奖");
  });

  const awardScore = Math.min(12, awards.length * 3);

  // 3. 主动参与度 (0~12分)
  const engagementScore = semesterMilestones.length > 0 || awards.length > 0 ? 12 : 6;

  return Math.min(40, milestoneScore + awardScore + engagementScore);
}
```

### 4.7 衰减机制

```typescript
/**
 * 当本学期某维度无有效数据时，继承上学期成长分并按衰减系数下降
 */
function inheritWithDecay(
  historyItems: any[],           // 该维度的历史记录
  currentSemester: string,
  decayFactor: number            // 衰减系数 (0~1)
): number {
  // 获取上学期成长分
  const prevSemester = getPreviousSemester(currentSemester);
  const prevItem = historyItems.find(h => h.semester === prevSemester);

  if (!prevItem) {
    // 连上学期也没有 → 说明是新生或完全没参与过
    // 返回一个鼓励性的低分，而非0
    return 5;
  }

  // 应用衰减
  const decayed = Math.round(prevItem.growthScore * decayFactor);
  return Math.max(5, decayed);  // 最低保留5分鼓励分
}
```

**各维度衰减系数**：

| 维度 | 衰减系数 | 理由 |
|------|----------|------|
| 学业 | 0.90 | 考试是定期进行的，偶尔一学期没考也正常，小幅衰减 |
| 心理 | 0.85 | 心情记录和测评应该持续关注，衰减稍快 |
| 职业 | 0.95 | 职业规划是长周期行为，衰减最慢 |
| 社交 | 0.80 | 一学期不参加活动，社交能力确实会退步 |
| 特长 | 0.70 | 特长不练真的会退步，衰减最快 |

### 4.8 学期快照生成

每学期末（或每月初）自动生成快照，存储到 `dimensionHistory`：

```typescript
interface DimensionSnapshot {
  semester: string;           // 学期标识
  date: string;               // 快照日期
  dimensions: {               // 五维显示分（Base + Growth）
    学业: number;
    心理: number;
    职业: number;
    社交: number;
    特长: number;
  };
  baseScores: {               // 五维基础分（单独记录）
    学业: number;
    心理: number;
    职业: number;
    社交: number;
    特长: number;
  };
  growthScores: {             // 五维成长分（单独记录）
    学业: number;
    心理: number;
    职业: number;
    社交: number;
    特长: number;
  };
  labels: {                   // 维度评价标签
    学业: "优秀" | "良好" | "一般" | "需关注";
    心理: "优秀" | "良好" | "一般" | "需关注";
    职业: "优秀" | "良好" | "一般" | "需关注";
    社交: "优秀" | "良好" | "一般" | "需关注";
    特长: "优秀" | "良好" | "一般" | "需关注";
  };
  changes: {                  // 环比变化（相对于上学期）
    学业: number;              // +5 表示上升5分
    心理: number;
    职业: number;
    社交: number;
    特长: number;
  };
}
```

### 4.9 维度评价标签规则

| 显示分 | 标签 | 颜色 | 含义 |
|--------|------|------|------|
| 80~100 | **优秀** | 绿色 `#16a34a` | 该维度表现突出，继续保持 |
| 65~79  | **良好** | 蓝色 `#2563eb` | 该维度发展健康，可再进一步 |
| 50~64  | **一般** | 黄色 `#ca8a04` | 该维度有进步空间，建议关注 |
| 0~49   | **需关注** | 红色 `#dc2626` | 该维度发展滞后，需要干预 |

> 标签基于**显示分（Base + Growth）**判定，而非仅看成长分。

---

## 五、插班生接入方案

### 5.1 问题定义

插班生（学期中转学进入）面临的核心问题：
1. 入学时已有同学在校多个学期，基础分差距大
2. 自己的历史数据为空，雷达图"从零开始"打击自信
3. 不了解学校的评价体系，不知道该怎么参与

### 5.2 解决方案

#### 5.2.1 入学时间个性化

每个学生的"入学学期"独立计算：

```typescript
// Student 模型新增字段
model Student {
  // ... 现有字段
  enrollmentDate    DateTime?  @map("enrollment_date")  // 实际入学日期
  isTransferStudent Boolean    @default(false) @map("is_transfer_student")
}
```

基础分计算时，`enrollmentSemester` 取学生的实际入学学期，而非全校统一学期。

#### 5.2.2 观察期加速机制

插班生前 **2 个学期**为观察期：
- 基础分每学期 +5 分（普通生 +3.5）
- 第一个学期的成长分有"新手保护"：
  - 只要完成任一维度的最低参与门槛（如做一次测评、记一次心情、参加一次活动），该维度成长分保底给 15 分
  - 避免因"还没摸清门路"导致分数难看

#### 5.2.3 历史数据回填（可选）

如果插班生转入时带来了历史成绩/活动记录：

```typescript
/**
 * 根据外部数据生成"虚拟快照"
 * 让插班生能看到自己过去的成长轨迹
 */
function generateVirtualSnapshots(
  transferRecords: TransferRecord[],  // 外部导入的成绩/活动记录
  enrollmentSemester: string
): DimensionSnapshot[] {
  // 按学期分组外部数据
  // 用同样的算法计算各学期的虚拟五维得分
  // 标注 isVirtual: true，UI 上用虚线或不同颜色区分
}
```

#### 5.2.4 插班生专属引导

Dashboard 对插班生显示专属提示：

> 🎉 **欢迎来到新府学！** 这是你在这里的第 N 个学期。前两个学期是"观察期"，系统会给予额外鼓励分。多参加活动、记录心情、完成测评，你的雷达图会快速成长！

---

## 六、雷达图展示方案

### 6.1 学生端雷达图（自比模式）

```
                    学业能力 85 ↑(+5)
                   /    |    \
                  /  优秀  |
         特长发展 ───┼─── 心理健康 72 →(+0)
           ↓(-3)   \     |     /  一般
                   \    |    /
                    社交协作 68 ↓(-2)
                         良好

        ─── 本学期    - - - 上学期
```

**设计要点**：
1. **实线** = 当前学期，**虚线** = 上学期
2. 每个维度标签旁显示：分数 + 环比变化箭头 + 变化值
3. 维度名下方显示评价标签（优秀/良好/一般/需关注）
4. **不显示班级平均**
5. 下方添加图例说明："和上学期相比，你在学业和特长上进步明显，社交方面需要多参加集体活动"

### 6.2 历史趋势图（新增）

在 Profile 页面增加"五维历史趋势"折线图：
- 横轴：学期（如 2024-秋、2025-春、2025-秋）
- 纵轴：显示分
- 五条线，每条代表一个维度
- 让学生一眼看出"哪个维度一直在涨，哪个在掉"

### 6.3 基础分 vs 成长分拆线图（教育意义）

可选展示（Space 页面）：
- 单维度展开后，显示两条线：
  - 蓝色实线：显示分（总分）
  - 灰色虚线：基础分（保底）
  - 蓝色填充区域：成长分（真实表现）
- 教育意义：让学生理解"学校给了我保底，但真实成长靠自己"

---

## 七、API 设计

### 7.1 更新后的聚合档案接口

```typescript
// GET /api/students/me/profile
// 返回结构更新
{
  student: { ... },

  // 五维数据（新版）
  fiveDimensions: {
    current: {          // 当前学期
      scores: { 学业: 85, 心理: 72, 职业: 58, 社交: 68, 特长: 62 },
      baseScores: { 学业: 50, 心理: 50, 职业: 50, 社交: 50, 特长: 50 },
      growthScores: { 学业: 35, 心理: 22, 职业: 8, 社交: 18, 特长: 12 },
      labels: { 学业: "优秀", 心理: "良好", 职业: "需关注", 社交: "良好", 特长: "一般" },
      changes: { 学业: +5, 心理: 0, 职业: +2, 社交: -2, 特长: -3 },
    },
    previous: {         // 上学期（用于雷达图叠加）
      scores: { 学业: 80, 心理: 72, 职业: 56, 社交: 70, 特长: 65 },
    },
    history: [          // 全部历史快照
      { semester: "2024-2025-1", scores: { ... } },
      { semester: "2024-2025-2", scores: { ... } },
    ],
  },

  // 移除了 fiveDimensionsAverage（班级平均）

  comments: [ ... ],
  milestones: [ ... ],
  activities: [ ... ],
  scoreSummary: { ... },
}
```

### 7.2 新增：五维计算服务

```typescript
// lib/dimension-calculator.ts
// 核心计算模块，供 API 和定时任务调用

export function calculateFiveDimensions(
  studentId: string,
  semester: string
): DimensionResult;

export function generateSemesterSnapshot(
  studentId: string,
  semester: string
): DimensionSnapshot;

export function batchGenerateSnapshots(
  semester: string
): Promise<{ success: number; failed: number }>;
```

### 7.3 新增：定时任务 API

```typescript
// 每月1号自动刷新所有学生当前学期五维得分
// POST /api/admin/dimensions/refresh (admin only)

// 每学期末自动生成快照
// POST /api/admin/dimensions/snapshot (admin only)
```

---

## 八、数据模型变更

### 8.1 Student 表新增字段

```prisma
model Student {
  // ... 现有字段

  enrollmentDate    DateTime?  @map("enrollment_date")
  isTransferStudent Boolean    @default(false) @map("is_transfer_student")
}
```

### 8.2 CareerProfile 表字段不变，内容格式升级

`fiveDimensions` 和 `dimensionHistory` 保持 JSON 存储，但格式升级：

```json
// fiveDimensions（当前实时数据）
{
  "currentSemester": "2024-2025-2",
  "scores": { "学业": 85, "心理": 72, "职业": 58, "社交": 68, "特长": 62 },
  "baseScores": { "学业": 50, "心理": 50, "职业": 50, "社交": 50, "特长": 50 },
  "growthScores": { "学业": 35, "心理": 22, "职业": 8, "社交": 18, "特长": 12 },
  "labels": { "学业": "优秀", "心理": "良好", "职业": "需关注", "社交": "良好", "特长": "一般" },
  "changes": { "学业": 5, "心理": 0, "职业": 2, "社交": -2, "特长": -3 },
  "calculatedAt": "2025-03-15T08:00:00Z"
}
```

```json
// dimensionHistory（历史快照数组）
[
  {
    "semester": "2024-2025-1",
    "date": "2025-01-20",
    "scores": { "学业": 80, "心理": 72, "职业": 56, "社交": 70, "特长": 65 },
    "baseScores": { "学业": 46.5, "心理": 46.5, "职业": 46.5, "社交": 46.5, "特长": 46.5 },
    "growthScores": { "学业": 33.5, "心理": 25.5, "职业": 9.5, "社交": 23.5, "特长": 18.5 },
    "labels": { "学业": "优秀", "心理": "良好", "职业": "需关注", "社交": "良好", "特长": "一般" },
    "changes": { "学业": 3, "心理": 2, "职业": -1, "社交": 5, "特长": 0 }
  }
]
```

### 8.3 新增行为日志表（可选，用于参与度计算）

```prisma
model BehaviorLog {
  id          String   @id @default(cuid())
  studentId   String   @map("student_id")
  action      String   // 行为类型：VIEW_ASSESSMENT, RECORD_MOOD, JOIN_ACTIVITY 等
  targetType  String?  @map("target_type") // 关联对象类型
  targetId    String?  @map("target_id")   // 关联对象ID
  semester    String
  createdAt   DateTime @default(now()) @map("created_at")

  student     Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@index([studentId, semester, action])
  @@map("behavior_logs")
}
```

> 注：BehaviorLog 为可选优化，V1 可用简化方案（固定参与度分）。

---

## 九、实施路线图

| 阶段 | 任务 | 优先级 | 预估工时 |
|------|------|--------|----------|
| **P0** | 编写 `lib/dimension-calculator.ts` 核心算法 | 🔴 高 | 4h |
| **P0** | 更新 `prisma/schema.prisma` 数据模型 | 🔴 高 | 1h |
| **P0** | 更新 `/api/students/me/profile` 聚合接口 | 🔴 高 | 2h |
| **P0** | 更新雷达图组件：自比模式 + 上学期叠加 | 🔴 高 | 3h |
| **P1** | 新增"五维历史趋势"折线图组件 | 🟡 中 | 2h |
| **P1** | 更新 Dashboard / Profile / Space 页面数据展示 | 🟡 中 | 3h |
| **P1** | 更新 seed 数据，使用新算法生成五维分数 | 🟡 中 | 2h |
| **P2** | 新增 BehaviorLog 模型和行为记录 | 🟢 低 | 3h |
| **P2** | 新增定时任务 API（月末刷新 + 学期快照） | 🟢 低 | 2h |
| **P2** | 管理端：五维计算日志与手动刷新功能 | 🟢 低 | 2h |

**总计**：约 24 工时，建议分 2 个 Sprint 完成（P0 + P1 在第一 Sprint，P2 在第二 Sprint）。

---

## 十、验收标准（BDD）

### 场景 1：新生看到基础分在涨

```gherkin
Given 学生小王是 2024 年秋季入学的新生
When 他每学期查看自己的五维雷达图
Then 即使他某学期什么都没做，基础分也会从 40 涨到 43.5 再涨到 47
And 他能看到基础分在"缓慢但稳定地上升"
```

### 场景 2：能看到自己的真实表现波动

```gherkin
Given 学生小李上学期参加了 3 次活动（社交成长分 18）
And 这学期他没有参加任何活动
When 他查看社交维度的历史趋势
Then 他能看到社交分从 64.5 下降到 56（基础分 50 + 成长分 18×0.8=14.4）
And 系统提示"你本学期社交活动参与较少，建议多参加集体活动"
```

### 场景 3：只和自己对比

```gherkin
Given 学生小张查看五维雷达图
When 页面加载完成
Then 雷达图上只显示两条线：本学期（实线）和上学期（虚线）
And 没有"班级平均"线
And 每个维度旁显示"↑(+5)"或"↓(-2)"的环比变化
```

### 场景 4：插班生快速融入

```gherkin
Given 学生小陈是 2025 年春季插班生
When 他在第一个学期完成了一次心理测评和一次活动参与
Then 他的心理维度显示"新手保护"标签
And 基础分按插班生加速规则计算（每学期 +5）
And Dashboard 显示插班生专属欢迎提示
```

### 场景 5：学期快照自动生成

```gherkin
Given 管理员在学期末调用快照生成 API
When API 执行完成
Then 所有学生的 dimensionHistory 中新增一条本学期记录
And 记录中包含 scores、baseScores、growthScores、labels、changes
And 新学期开始时，changes 字段基于这条快照计算
```

---

## 十一、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 基础分"保底"让学生产生"躺平也能涨"的错觉 | 中 | UI 明确区分基础分/成长分，教育引导"真实成长靠自己" |
| 衰减机制打击学生自信 | 中 | 衰减时给出具体建议（"参加一次活动即可恢复"），而非单纯扣分 |
| 插班生加速引发老生不满 | 低 | 加速仅影响基础分（保底），不影响成长分排名/评优 |
| 算法复杂度过高导致计算慢 | 中 | 采用"预计算 + 缓存"策略，页面加载时读取缓存而非实时计算 |
| 历史数据迁移困难 | 低 | 旧版 `fiveDimensions` 是简单 JSON，可用脚本批量转换；缺失字段用默认值补全 |

---

## 十二、附录：核心公式速查

```
显示分 = Base + Growth  (0~100)
Base = min(60, 40 + 学期数 × 3.5)  // 普通生
Base = min(60, 40 + 学期数 × 5.0)  // 插班生前两学期

学业 Growth = 加权平均得分率 × 40
心理 Growth = 测评(12) + 心情(12) + 参与(12) + 连续奖励(4)
职业 Growth = 测评完成(16) + 目标完成(16) + 参与(8)
社交 Growth = 活动(16) + 评语(12) + 参与(12)
特长 Growth = 里程碑(16) + 获奖(12) + 参与(12)

衰减后 Growth = 上学期 Growth × 衰减系数  (无数据时)

标签规则：
  80~100 = 优秀(绿)  65~79 = 良好(蓝)
  50~64  = 一般(黄)  0~49  = 需关注(红)
```

---

*本文档由 Claude Code 辅助设计，遵循「一生一案」项目 VibeCoding 原则。*
