/**
 * 学生生涯发展演示数据
 * 展示完整学生（K1→K11）和插班生（K8→K11）的五维发展轨迹
 */

export interface SemesterData {
  id: string;           // e.g. "k1-fall"
  label: string;        // e.g. "K1 秋"
  grade: number;
  term: string;
  baseScore: number;    // 基础分（保底）
  dimensions: {
    学业: number;       // 显示分 = baseScore + growth
    心理: number;
    职业: number;
    社交: number;
    特长: number;
  };
  growthScores: {
    学业: number;
    心理: number;
    职业: number;
    社交: number;
    特长: number;
  };
}

export interface JourneyEvent {
  semesterId: string;
  type: "milestone" | "activity" | "assessment" | "behavior" | "system";
  title: string;
  description: string;
  impact: string;
  dimension: string;
  icon: string;
}

export interface StudentProfile {
  name: string;
  type: "full" | "transfer";
  description: string;
  enrollment: string;
  avatar: string;
  color: string;
  semesters: SemesterData[];
  events: JourneyEvent[];
  keySnapshots: { semesterId: string; label: string; story: string }[];
}

// ==================== 学生1：林小满（完整K1→K11）====================

const linSemesters: SemesterData[] = [
  // K1 (小学低年级)
  { id: "k1-fall", label: "K1 秋", grade: 1, term: "秋", baseScore: 40.0, dimensions: { 学业: 55, 心理: 70, 职业: 45, 社交: 58, 特长: 48 }, growthScores: { 学业: 15, 心理: 30, 职业: 5, 社交: 18, 特长: 8 } },
  { id: "k1-spring", label: "K1 春", grade: 1, term: "春", baseScore: 43.5, dimensions: { 学业: 60, 心理: 74, 职业: 49, 社交: 63, 特长: 56 }, growthScores: { 学业: 16, 心理: 31, 职业: 5, 社交: 20, 特长: 12 } },
  // K2
  { id: "k2-fall", label: "K2 秋", grade: 2, term: "秋", baseScore: 47.0, dimensions: { 学业: 64, 心理: 79, 职业: 53, 社交: 68, 特长: 62 }, growthScores: { 学业: 17, 心理: 32, 职业: 6, 社交: 21, 特长: 15 } },
  { id: "k2-spring", label: "K2 春", grade: 2, term: "春", baseScore: 50.5, dimensions: { 学业: 68, 心理: 80, 职业: 56, 社交: 72, 特长: 64 }, growthScores: { 学业: 18, 心理: 30, 职业: 6, 社交: 22, 特长: 14 } },
  // K3
  { id: "k3-fall", label: "K3 秋", grade: 3, term: "秋", baseScore: 54.0, dimensions: { 学业: 73, 心理: 83, 职业: 61, 社交: 77, 特长: 70 }, growthScores: { 学业: 19, 心理: 29, 职业: 7, 社交: 23, 特长: 16 } },
  { id: "k3-spring", label: "K3 春", grade: 3, term: "春", baseScore: 57.5, dimensions: { 学业: 77, 心理: 85, 职业: 64, 社交: 82, 特长: 74 }, growthScores: { 学业: 20, 心理: 28, 职业: 7, 社交: 24, 特长: 17 } },
  // K4 (基础分封顶)
  { id: "k4-fall", label: "K4 秋", grade: 4, term: "秋", baseScore: 60.0, dimensions: { 学业: 85, 心理: 88, 职业: 68, 社交: 85, 特长: 78 }, growthScores: { 学业: 25, 心理: 28, 职业: 8, 社交: 25, 特长: 18 } },
  { id: "k4-spring", label: "K4 春", grade: 4, term: "春", baseScore: 60.0, dimensions: { 学业: 82, 心理: 87, 职业: 68, 社交: 86, 特长: 79 }, growthScores: { 学业: 22, 心理: 27, 职业: 8, 社交: 26, 特长: 19 } },
  // K5
  { id: "k5-fall", label: "K5 秋", grade: 5, term: "秋", baseScore: 60.0, dimensions: { 学业: 81, 心理: 86, 职业: 68, 社交: 85, 特长: 72 }, growthScores: { 学业: 21, 心理: 26, 职业: 8, 社交: 25, 特长: 12 } },
  { id: "k5-spring", label: "K5 春", grade: 5, term: "春", baseScore: 60.0, dimensions: { 学业: 82, 心理: 85, 职业: 69, 社交: 84, 特长: 74 }, growthScores: { 学业: 22, 心理: 25, 职业: 9, 社交: 24, 特长: 14 } },
  // K6 (小学毕业)
  { id: "k6-fall", label: "K6 秋", grade: 6, term: "秋", baseScore: 60.0, dimensions: { 学业: 80, 心理: 82, 职业: 70, 社交: 88, 特长: 82 }, growthScores: { 学业: 20, 心理: 22, 职业: 10, 社交: 28, 特长: 22 } },
  { id: "k6-spring", label: "K6 春", grade: 6, term: "春", baseScore: 60.0, dimensions: { 学业: 83, 心理: 84, 职业: 70, 社交: 90, 特长: 80 }, growthScores: { 学业: 23, 心理: 24, 职业: 10, 社交: 30, 特长: 20 } },
  // K7 (初中)
  { id: "k7-fall", label: "K7 秋", grade: 7, term: "秋", baseScore: 60.0, dimensions: { 学业: 86, 心理: 80, 职业: 72, 社交: 82, 特长: 78 }, growthScores: { 学业: 26, 心理: 20, 职业: 12, 社交: 22, 特长: 18 } },
  { id: "k7-spring", label: "K7 春", grade: 7, term: "春", baseScore: 60.0, dimensions: { 学业: 84, 心理: 81, 职业: 72, 社交: 84, 特长: 77 }, growthScores: { 学业: 24, 心理: 21, 职业: 12, 社交: 24, 特长: 17 } },
  // K8 (青春期低谷)
  { id: "k8-fall", label: "K8 秋", grade: 8, term: "秋", baseScore: 60.0, dimensions: { 学业: 78, 心理: 75, 职业: 75, 社交: 85, 特长: 80 }, growthScores: { 学业: 18, 心理: 15, 职业: 15, 社交: 25, 特长: 20 } },
  { id: "k8-spring", label: "K8 春", grade: 8, term: "春", baseScore: 60.0, dimensions: { 学业: 79, 心理: 76, 职业: 75, 社交: 86, 特长: 79 }, growthScores: { 学业: 19, 心理: 16, 职业: 15, 社交: 26, 特长: 19 } },
  // K9 (高中)
  { id: "k9-fall", label: "K9 秋", grade: 9, term: "秋", baseScore: 60.0, dimensions: { 学业: 88, 心理: 80, 职业: 82, 社交: 88, 特长: 85 }, growthScores: { 学业: 28, 心理: 20, 职业: 22, 社交: 28, 特长: 25 } },
  { id: "k9-spring", label: "K9 春", grade: 9, term: "春", baseScore: 60.0, dimensions: { 学业: 86, 心理: 82, 职业: 84, 社交: 87, 特长: 84 }, growthScores: { 学业: 26, 心理: 22, 职业: 24, 社交: 27, 特长: 24 } },
  // K10
  { id: "k10-fall", label: "K10 秋", grade: 10, term: "秋", baseScore: 60.0, dimensions: { 学业: 82, 心理: 85, 职业: 88, 社交: 86, 特长: 88 }, growthScores: { 学业: 22, 心理: 25, 职业: 28, 社交: 26, 特长: 28 } },
  { id: "k10-spring", label: "K10 春", grade: 10, term: "春", baseScore: 60.0, dimensions: { 学业: 84, 心理: 84, 职业: 88, 社交: 85, 特长: 87 }, growthScores: { 学业: 24, 心理: 24, 职业: 28, 社交: 25, 特长: 27 } },
  // K11 (毕业)
  { id: "k11-fall", label: "K11 秋", grade: 11, term: "秋", baseScore: 60.0, dimensions: { 学业: 95, 心理: 90, 职业: 92, 社交: 90, 特长: 95 }, growthScores: { 学业: 35, 心理: 30, 职业: 32, 社交: 30, 特长: 35 } },
  { id: "k11-spring", label: "K11 春", grade: 11, term: "春", baseScore: 60.0, dimensions: { 学业: 98, 心理: 92, 职业: 95, 社交: 92, 特长: 96 }, growthScores: { 学业: 38, 心理: 32, 职业: 35, 社交: 32, 特长: 36 } },
];

const linEvents: JourneyEvent[] = [
  { semesterId: "k1-fall", type: "system", title: "入学适应", description: "刚进入小学，对新环境充满好奇", impact: "心理维度基础分起步 40，显示分 70，处于良好状态", dimension: "心理", icon: "🏫" },
  { semesterId: "k2-spring", type: "milestone", title: "校园艺术节表演", description: "在全校艺术节上表演钢琴独奏《小星星变奏曲》", impact: "特长维度从 48 跃升至 64，发现艺术天赋", dimension: "特长", icon: "🎹" },
  { semesterId: "k3-fall", type: "activity", title: "加入科学兴趣小组", description: "每周参加科学实验活动", impact: "学业维度稳步提升，从 55 到 73", dimension: "学业", icon: "🔬" },
  { semesterId: "k4-fall", type: "milestone", title: "数学竞赛三等奖", description: "参加区小学生数学竞赛获三等奖", impact: "学业成长分从 20 提升到 25，建立学科自信", dimension: "学业", icon: "🏆" },
  { semesterId: "k4-fall", type: "behavior", title: "基础分封顶", description: "在校满 6 学期，基础分达到封顶 60", impact: "此后显示分增长完全依赖成长分", dimension: "系统", icon: "📈" },
  { semesterId: "k5-fall", type: "behavior", title: "学业优先策略", description: "减少特长训练时间，专注学业", impact: "特长成长分从 19 降至 12，学业维持稳定", dimension: "特长", icon: "⚖️" },
  { semesterId: "k6-spring", type: "milestone", title: "当选班长", description: "以高票当选六年级班长", impact: "社交维度达到巅峰 90，成长分 30", dimension: "社交", icon: "👑" },
  { semesterId: "k6-spring", type: "assessment", title: "钢琴七级通过", description: "中国音乐学院钢琴七级考试通过", impact: "特长维度回升至 80", dimension: "特长", icon: "🎵" },
  { semesterId: "k7-fall", type: "behavior", title: "初中适应期", description: "进入初中，课程难度加大，竞争加剧", impact: "心理维度从 84 降至 80，学业维度波动", dimension: "心理", icon: "🔄" },
  { semesterId: "k8-fall", type: "behavior", title: "青春期情绪低谷", description: "情绪波动大，学习动力下降", impact: "心理维度降至 75（成长分仅15），学业降至 78", dimension: "心理", icon: "😔" },
  { semesterId: "k8-spring", type: "assessment", title: "心理咨询介入", description: "学校心理老师主动约谈", impact: "心理维度止跌企稳，后续回升", dimension: "心理", icon: "💬" },
  { semesterId: "k9-fall", type: "assessment", title: "霍兰德测评", description: "职业兴趣测评结果为「艺术型+研究型」", impact: "职业维度从 75 跃升至 82，明确发展方向", dimension: "职业", icon: "🔍" },
  { semesterId: "k9-fall", type: "activity", title: "加入校乐队", description: "担任校乐队键盘手", impact: "特长维度回升至 85，社交维度 88", dimension: "特长", icon: "🎸" },
  { semesterId: "k10-fall", type: "behavior", title: "模考失利", description: "期中模拟考试发挥失常", impact: "学业维度从 86 降至 82，心理维度短期下降", dimension: "学业", icon: "📉" },
  { semesterId: "k10-spring", type: "milestone", title: "原创音乐作品", description: "创作原创钢琴曲并在校园音乐节演出", impact: "特长维度达到 87，职业维度 88", dimension: "特长", icon: "✨" },
  { semesterId: "k11-fall", type: "behavior", title: "高考冲刺", description: "全力冲刺，各科成绩稳步提升", impact: "学业维度达到巅峰 95，五维全面开花", dimension: "学业", icon: "🚀" },
  { semesterId: "k11-spring", type: "milestone", title: "全额奖学金录取", description: "获国际知名音乐学院全额奖学金录取", impact: "五维全面高分：学业98 心理92 职业95 社交92 特长96", dimension: "全部", icon: "🎓" },
];

// ==================== 学生2：张新航（K8插班→K11）====================

const zhangSemesters: SemesterData[] = [
  // K8 (插班入学 — 观察期)
  { id: "k8-fall", label: "K8 秋", grade: 8, term: "秋", baseScore: 40.0, dimensions: { 学业: 56, 心理: 58, 职业: 50, 社交: 52, 特长: 54 }, growthScores: { 学业: 16, 心理: 18, 职业: 10, 社交: 12, 特长: 14 } },
  { id: "k8-spring", label: "K8 春", grade: 8, term: "春", baseScore: 45.0, dimensions: { 学业: 65, 心理: 67, 职业: 59, 社交: 63, 特长: 63 }, growthScores: { 学业: 20, 心理: 22, 职业: 14, 社交: 18, 特长: 18 } },
  // K9 (观察期结束)
  { id: "k9-fall", label: "K9 秋", grade: 9, term: "秋", baseScore: 50.0, dimensions: { 学业: 74, 心理: 75, 职业: 68, 社交: 74, 特长: 72 }, growthScores: { 学业: 24, 心理: 25, 职业: 18, 社交: 24, 特长: 22 } },
  { id: "k9-spring", label: "K9 春", grade: 9, term: "春", baseScore: 53.5, dimensions: { 学业: 79, 心理: 80, 职业: 75, 社交: 79, 特长: 77 }, growthScores: { 学业: 26, 心理: 27, 职业: 22, 社交: 26, 特长: 24 } },
  // K10 (完全融入)
  { id: "k10-fall", label: "K10 秋", grade: 10, term: "秋", baseScore: 57.0, dimensions: { 学业: 85, 心理: 85, 职业: 83, 社交: 85, 特长: 83 }, growthScores: { 学业: 28, 心理: 28, 职业: 26, 社交: 28, 特长: 26 } },
  { id: "k10-spring", label: "K10 春", grade: 10, term: "春", baseScore: 60.0, dimensions: { 学业: 90, 心理: 90, 职业: 88, 社交: 90, 特长: 88 }, growthScores: { 学业: 30, 心理: 30, 职业: 28, 社交: 30, 特长: 28 } },
  // K11 (追平超越)
  { id: "k11-fall", label: "K11 秋", grade: 11, term: "秋", baseScore: 60.0, dimensions: { 学业: 94, 心理: 92, 职业: 90, 社交: 92, 特长: 90 }, growthScores: { 学业: 34, 心理: 32, 职业: 30, 社交: 32, 特长: 30 } },
  { id: "k11-spring", label: "K11 春", grade: 11, term: "春", baseScore: 60.0, dimensions: { 学业: 96, 心理: 93, 职业: 92, 社交: 93, 特长: 92 }, growthScores: { 学业: 36, 心理: 33, 职业: 32, 社交: 33, 特长: 32 } },
];

const zhangEvents: JourneyEvent[] = [
  { semesterId: "k8-fall", type: "system", title: "🎉 插班入学", description: "从公立学校转入新府学，开启新的学习旅程", impact: "基础分从入学起点 40 开始，观察期启动", dimension: "系统", icon: "🎒" },
  { semesterId: "k8-fall", type: "system", title: "新手保护激活", description: "系统自动激活各维度新手保护期", impact: "各维度成长分保底 10-16 分，避免初始分数过低打击信心", dimension: "系统", icon: "🛡️" },
  { semesterId: "k8-fall", type: "assessment", title: "霍兰德测评", description: "入学即完成职业兴趣测评", impact: "职业维度新手保护 + 测评完成奖励 = 10 分起步", dimension: "职业", icon: "📝" },
  { semesterId: "k8-fall", type: "activity", title: "新生破冰活动", description: "参加学校组织的新生欢迎会", impact: "社交维度新手保护激活，获得初始社交分 12", dimension: "社交", icon: "🤝" },
  { semesterId: "k8-fall", type: "milestone", title: "发现篮球特长", description: "体育课上展现出色的篮球天赋", impact: "特长维度新手保护 + 里程碑奖励 = 14 分", dimension: "特长", icon: "🏀" },
  { semesterId: "k8-spring", type: "activity", title: "加入篮球队", description: "通过选拔进入校篮球队", impact: "特长成长分从 14 提升至 18，社交成长分 18", dimension: "特长", icon: "⛹️" },
  { semesterId: "k8-spring", type: "behavior", title: "观察期加速", description: "插班生第二学期，基础分加速增长 +5", impact: "基础分从 40 → 45，显示分全面提升", dimension: "系统", icon: "⚡" },
  { semesterId: "k8-spring", type: "assessment", title: "心理适应评估", description: "心理老师评估适应情况良好", impact: "心理维度从 58 升至 67，消除转学焦虑", dimension: "心理", icon: "💚" },
  { semesterId: "k9-fall", type: "system", title: "观察期结束", description: "插班生观察期结束，转入普通生规则", impact: "基础分增速从 +5/学期 恢复为 +3.5/学期", dimension: "系统", icon: "✅" },
  { semesterId: "k9-fall", type: "activity", title: "篮球队主力", description: "成为校篮球队主力球员", impact: "特长维度 72，社交维度 74，快速建立校园存在感", dimension: "特长", icon: "⭐" },
  { semesterId: "k9-spring", type: "milestone", title: "区域篮球赛获奖", description: "代表学校参加区域篮球联赛获亚军", impact: "特长成长分 24，学业维度也随团队荣誉提升", dimension: "特长", icon: "🥈" },
  { semesterId: "k10-fall", type: "behavior", title: "学业全面跟上", description: "课程难度加大但成绩稳步提升", impact: "学业显示分 85，已超越部分原在校生", dimension: "学业", icon: "📚" },
  { semesterId: "k10-spring", type: "milestone", title: "市级篮球赛MVP", description: "市级中学生篮球赛最有价值球员", impact: "特长显示分 88，五维全面达到优秀水平", dimension: "特长", icon: "🏆" },
  { semesterId: "k11-fall", type: "behavior", title: "基础分封顶", description: "在校满 5 学期，基础分达到封顶 60", impact: "此后显示分增长完全依赖成长分，与在校生同一起跑线", dimension: "系统", icon: "📊" },
  { semesterId: "k11-spring", type: "milestone", title: "体育特长生认定", description: "获省级体育特长生资格认定", impact: "五维全面高分，成功融入学校体系", dimension: "全部", icon: "🎖️" },
];

// ==================== 导出学生档案 ====================

export const fullStudent: StudentProfile = {
  name: "林小满",
  type: "full",
  description: "从新府学 K1 入学，完整经历 K1→K11 的全过程。她的五维发展轨迹展现了「基础分保底增长 + 成长分真实波动」的双轨模型。",
  enrollment: "K1 秋（小学一年级入学）",
  avatar: "👧",
  color: "#2563eb",
  semesters: linSemesters,
  events: linEvents,
  keySnapshots: [
    { semesterId: "k1-fall", label: "K1 入学", story: "懵懂新生，五维尚在萌芽" },
    { semesterId: "k4-fall", label: "K4 突破", story: "数学竞赛获奖，基础分封顶，学业自信建立" },
    { semesterId: "k8-fall", label: "K8 低谷", story: "青春期情绪波动，心理维度降至75，学业下滑" },
    { semesterId: "k11-spring", label: "K11 毕业", story: "五维全面巅峰，获全额奖学金录取" },
  ],
};

export const transferStudent: StudentProfile = {
  name: "张新航",
  type: "transfer",
  description: "K8 从公立学校转入新府学。插班生观察期机制（基础分加速 + 新手保护）帮助他快速融入，8个学期后五维全面追平在校生。",
  enrollment: "K8 秋（八年级插班入学）",
  avatar: "👦",
  color: "#dc2626",
  semesters: zhangSemesters,
  events: zhangEvents,
  keySnapshots: [
    { semesterId: "k8-fall", label: "K8 入学", story: "插班生，基础分40起步，系统激活新手保护" },
    { semesterId: "k9-fall", label: "K9 融入", story: "观察期结束，已交到朋友，加入篮球队" },
    { semesterId: "k10-spring", label: "K10 超越", story: "获市级篮球MVP，五维全面优秀" },
    { semesterId: "k11-spring", label: "K11 认定", story: "体育特长生认定，成功融入学校体系" },
  ],
};

// ==================== 影响因素说明 ====================

export const dimensionFactors = [
  {
    dimension: "学业",
    color: "#dc2626",
    icon: "📚",
    factors: [
      { name: "考试成绩", weight: "40%", description: "期中/期末/月考的加权得分率" },
      { name: "作业完成", weight: "20%", description: "日常作业提交率和质量" },
      { name: "课堂参与", weight: "15%", description: "课堂互动、小组讨论参与度" },
      { name: "竞赛获奖", weight: "15%", description: "学科竞赛、知识竞赛成绩" },
      { name: "学习态度", weight: "10%", description: "教师评语中的学习态度评价" },
    ],
    behaviors: [
      "✅ 认真备考 → 学业成长分提升",
      "✅ 参加竞赛 → 学业 + 特长双提升",
      "⚠️ 作业拖欠 → 学业成长分停滞",
      "❌ 连续缺考 → 触发衰减机制（×0.9）",
    ],
  },
  {
    dimension: "心理",
    color: "#0891b2",
    icon: "🧠",
    factors: [
      { name: "心理测评", weight: "30%", description: "MHT、SCL90 等标准化测评结果" },
      { name: "心情日记", weight: "30%", description: "心情记录连续性和情绪稳定性" },
      { name: "主动求助", weight: "20%", description: "主动预约心理咨询、情绪调节" },
      { name: "同伴关系", weight: "20%", description: "班级氛围适应、 friendships 质量" },
    ],
    behaviors: [
      "✅ 坚持记录心情 → 心理成长分稳步上升",
      "✅ 主动心理咨询 → 心理维度获得额外加分",
      "⚠️ 情绪波动期 → 成长分短期下降（正常）",
      "❌ 长期不记录 → 触发衰减（×0.85），系统预警",
    ],
  },
  {
    dimension: "职业",
    color: "#9333ea",
    icon: "🎯",
    factors: [
      { name: "职业测评", weight: "40%", description: "霍兰德、MBTI 等测评完成度" },
      { name: "目标设定", weight: "40%", description: "短期/长期目标的设定与完成" },
      { name: "探索行为", weight: "20%", description: "职业讲座、大学参观、实习体验" },
    ],
    behaviors: [
      "✅ 完成霍兰德测评 → 职业维度激活",
      "✅ 设定升学目标 → 目标完成度加分",
      "⚠️ 无职业规划 → 成长分低但基础分仍涨",
      "❌ 长期不参与 → 衰减最慢（×0.95），容忍度高",
    ],
  },
  {
    dimension: "社交",
    color: "#ca8a04",
    icon: "🤝",
    factors: [
      { name: "活动参与", weight: "40%", description: "集体活动、社团、义工的参与度" },
      { name: "教师评语", weight: "30%", description: "评语中的团队合作、沟通能力标签" },
      { name: "角色担当", weight: "30%", description: "班干部、社团负责人等领导力角色" },
    ],
    behaviors: [
      "✅ 参加社团活动 → 社交成长分提升",
      "✅ 担任班干部 → 社交 + 特长双提升",
      "⚠️ 内向少言 → 成长分较低但不惩罚",
      "❌ 一学期零活动 → 衰减明显（×0.8），建议参与",
    ],
  },
  {
    dimension: "特长",
    color: "#16a34a",
    icon: "✨",
    factors: [
      { name: "里程碑", weight: "40%", description: "技能考级、比赛获奖、作品创作" },
      { name: "成果产出", weight: "30%", description: "比赛奖项、演出、发表作品" },
      { name: "持续投入", weight: "30%", description: "每周训练时长、社团出勤率" },
    ],
    behaviors: [
      "✅ 里程碑申报 → 特长维度核心加分项",
      "✅ 比赛获奖 → 特长 + 社交双提升",
      "⚠️ 减少练习 → 成长分自然回落",
      "❌ 完全放弃 → 衰减最快（×0.7），不练真的会退步",
    ],
  },
];

// ==================== 插班生机制说明 ====================

export const transferMechanism = [
  {
    title: "入学时间个性化",
    icon: "📅",
    description: "插班生的基础分计算从实际入学学期开始，而非全校统一起点。避免和已在读多年的同学对比基础分。",
    example: "张新航 K8 入学 → 基础分从 40 起步，而非继承他人的 57",
  },
  {
    title: "观察期加速",
    icon: "⚡",
    description: "前两个学期为基础分加速期，每学期 +5 分（普通生 +3.5），帮助插班生快速追赶。",
    example: "K8 秋 40 → K8 春 45 → K9 秋 50（普通生同期仅 47）",
  },
  {
    title: "新手保护",
    icon: "🛡️",
    description: "观察期内，只要完成最低参与门槛（一次测评/活动/记录），各维度成长分保底 10-15 分。",
    example: "入学即完成霍兰德测评 → 职业维度保底 10 分，不因「还没摸清」而被判低分",
  },
  {
    title: "行为替代数据",
    icon: "🔄",
    description: "插班生前两学期允许用「行为记录」替代部分历史数据要求。如提交一次心情记录即算心理维度参与。",
    example: "无需等到学期末测评，记录一次心情即可获得心理成长分",
  },
  {
    title: "虚拟历史回填",
    icon: "📊",
    description: "如插班生携带外部成绩/活动记录，可生成「虚拟快照」，在雷达图上用虚线展示过去轨迹。",
    example: "张新航携带公立学校成绩单 → 生成 K1-K7 虚拟快照",
  },
  {
    title: "专属引导提示",
    icon: "💡",
    description: "Dashboard 显示插班生专属欢迎提示和待办清单，引导完成关键行为快速建立五维数据。",
    example: "「欢迎来到新府学！前两个学期是观察期，多参加活动、记录心情、完成测评，你的雷达图会快速成长！」",
  },
];
