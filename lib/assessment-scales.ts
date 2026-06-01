/**
 * 心理测评量表定义
 */

export interface ScaleOption {
  value: number;
  label: string;
}

export interface ScaleQuestion {
  id: string;
  text: string;
  options: ScaleOption[];
}

export interface ScaleResultRange {
  min: number;
  max: number;
  label: string;
  description: string;
  riskLevel: "NORMAL" | "WATCH" | "WARNING";
}

export interface AssessmentScale {
  id: string;
  code: string;
  name: string;
  description: string;
  type: "PSYCHOLOGY" | "CAREER" | "PERSONALITY";
  questions: ScaleQuestion[];
  resultRanges: ScaleResultRange[];
}

// 中学生心理健康量表（MHT）简化版 - 学习焦虑维度
export const mhtScale: AssessmentScale = {
  id: "mht-learning",
  code: "MHT-LEARNING",
  name: "学习焦虑测评",
  description: "评估学生在学习过程中的焦虑水平，包括考试焦虑、作业压力等方面。",
  type: "PSYCHOLOGY",
  questions: [
    {
      id: "q1",
      text: "考试时，我会紧张得连平时记得很熟的知识也想不起来。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
    {
      id: "q2",
      text: "老师提问时，我会紧张得说不出话来。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
    {
      id: "q3",
      text: "当我考试成绩不理想时，我会担心家长或老师的批评。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
    {
      id: "q4",
      text: "做作业时，我会因为担心做错而感到焦虑。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
    {
      id: "q5",
      text: "面对新的学习内容，我会担心自己学不会。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
    {
      id: "q6",
      text: "临近考试时，我会失眠或食欲下降。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
    {
      id: "q7",
      text: "我会因为担心学习成绩不好而感到心烦意乱。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
    {
      id: "q8",
      text: "在课堂上被点名回答问题时，我会心跳加速。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
    {
      id: "q9",
      text: "我会因为学习压力而感到身体不适（如头痛、胃痛）。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
    {
      id: "q10",
      text: "我觉得自己的学习负担太重，难以承受。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
  ],
  resultRanges: [
    {
      min: 0,
      max: 8,
      label: "学习焦虑水平正常",
      description:
        "你的学习焦虑水平在正常范围内。你能够较好地应对学习压力，保持良好的学习状态。建议继续保持积极的学习态度。",
      riskLevel: "NORMAL",
    },
    {
      min: 9,
      max: 16,
      label: "学习焦虑水平偏高",
      description:
        "你的学习焦虑水平偏高，可能会在一定程度上影响学习效率和身心健康。建议适当调整学习方法，合理安排学习时间，必要时可与心理老师交流。",
      riskLevel: "WATCH",
    },
    {
      min: 17,
      max: 30,
      label: "学习焦虑水平较高",
      description:
        "你的学习焦虑水平较高，可能已经对学习和生活产生了明显影响。建议尽快与心理老师或家长沟通，寻求专业的帮助和支持。",
      riskLevel: "WARNING",
    },
  ],
};

// 人际关系诊断量表简化版
export const relationshipScale: AssessmentScale = {
  id: "relationship",
  code: "RELATIONSHIP",
  name: "人际关系综合诊断",
  description: "评估学生的人际交往能力和人际困扰程度。",
  type: "PSYCHOLOGY",
  questions: [
    {
      id: "q1",
      text: "我觉得自己很难与同学建立亲密的友谊。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
    {
      id: "q2",
      text: "在集体活动中，我会感到被孤立或排斥。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
    {
      id: "q3",
      text: "与别人发生矛盾时，我不知道如何妥善处理。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
    {
      id: "q4",
      text: "我会因为担心说错话而不敢主动与人交流。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
    {
      id: "q5",
      text: "我觉得身边的同学不理解我。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
    {
      id: "q6",
      text: "在小组合作中，我会担心自己的意见不被采纳。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
    {
      id: "q7",
      text: "我会因为与朋友的矛盾而影响学习情绪。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
    {
      id: "q8",
      text: "我觉得老师对我有偏见或不公平。",
      options: [
        { value: 0, label: "从不" },
        { value: 1, label: "偶尔" },
        { value: 2, label: "经常" },
        { value: 3, label: "总是" },
      ],
    },
  ],
  resultRanges: [
    {
      min: 0,
      max: 6,
      label: "人际关系良好",
      description:
        "你的人际交往能力良好，能够与他人建立和谐的关系。继续保持开放和真诚的态度。",
      riskLevel: "NORMAL",
    },
    {
      min: 7,
      max: 14,
      label: "人际关系存在一定困扰",
      description:
        "你在人际交往中遇到了一些困扰。建议主动参加集体活动，学习沟通技巧，必要时可与心理老师交流。",
      riskLevel: "WATCH",
    },
    {
      min: 15,
      max: 24,
      label: "人际关系困扰较严重",
      description:
        "你在人际交往方面存在较严重的困扰，可能已经影响到日常生活和学习。建议尽快寻求心理老师的帮助。",
      riskLevel: "WARNING",
    },
  ],
};

// 霍兰德职业兴趣测试简化版
export const hollandScale: AssessmentScale = {
  id: "holland",
  code: "HOLLAND",
  name: "霍兰德职业兴趣测试（简化版）",
  description: "基于霍兰德职业兴趣理论，帮助你了解自己的职业兴趣类型。",
  type: "CAREER",
  questions: [
    {
      id: "q1",
      text: "我喜欢动手操作工具或机械。",
      options: [
        { value: 0, label: "不喜欢" },
        { value: 1, label: "一般" },
        { value: 2, label: "比较喜欢" },
        { value: 3, label: "非常喜欢" },
      ],
    },
    {
      id: "q2",
      text: "我喜欢研究和探索事物的原理。",
      options: [
        { value: 0, label: "不喜欢" },
        { value: 1, label: "一般" },
        { value: 2, label: "比较喜欢" },
        { value: 3, label: "非常喜欢" },
      ],
    },
    {
      id: "q3",
      text: "我喜欢通过绘画、音乐或写作来表达自己。",
      options: [
        { value: 0, label: "不喜欢" },
        { value: 1, label: "一般" },
        { value: 2, label: "比较喜欢" },
        { value: 3, label: "非常喜欢" },
      ],
    },
    {
      id: "q4",
      text: "我喜欢帮助别人解决问题。",
      options: [
        { value: 0, label: "不喜欢" },
        { value: 1, label: "一般" },
        { value: 2, label: "比较喜欢" },
        { value: 3, label: "非常喜欢" },
      ],
    },
    {
      id: "q5",
      text: "我喜欢组织和管理活动或项目。",
      options: [
        { value: 0, label: "不喜欢" },
        { value: 1, label: "一般" },
        { value: 2, label: "比较喜欢" },
        { value: 3, label: "非常喜欢" },
      ],
    },
    {
      id: "q6",
      text: "我喜欢按部就班地处理数据和文件。",
      options: [
        { value: 0, label: "不喜欢" },
        { value: 1, label: "一般" },
        { value: 2, label: "比较喜欢" },
        { value: 3, label: "非常喜欢" },
      ],
    },
    {
      id: "q7",
      text: "我喜欢户外活动，如运动、旅行。",
      options: [
        { value: 0, label: "不喜欢" },
        { value: 1, label: "一般" },
        { value: 2, label: "比较喜欢" },
        { value: 3, label: "非常喜欢" },
      ],
    },
    {
      id: "q8",
      text: "我喜欢思考和分析抽象的概念。",
      options: [
        { value: 0, label: "不喜欢" },
        { value: 1, label: "一般" },
        { value: 2, label: "比较喜欢" },
        { value: 3, label: "非常喜欢" },
      ],
    },
    {
      id: "q9",
      text: "我喜欢在公众面前演讲或表演。",
      options: [
        { value: 0, label: "不喜欢" },
        { value: 1, label: "一般" },
        { value: 2, label: "比较喜欢" },
        { value: 3, label: "非常喜欢" },
      ],
    },
    {
      id: "q10",
      text: "我喜欢照顾他人或动物。",
      options: [
        { value: 0, label: "不喜欢" },
        { value: 1, label: "一般" },
        { value: 2, label: "比较喜欢" },
        { value: 3, label: "非常喜欢" },
      ],
    },
  ],
  resultRanges: [
    {
      min: 0,
      max: 10,
      label: "兴趣倾向尚不明显",
      description:
        "你的职业兴趣倾向还不够明显。建议多参与不同类型的活动，探索自己的兴趣领域。",
      riskLevel: "NORMAL",
    },
    {
      min: 11,
      max: 20,
      label: "兴趣倾向初步形成",
      description:
        "你已经初步形成了一些职业兴趣倾向。建议结合自己的优势学科和兴趣，进一步了解相关职业方向。",
      riskLevel: "NORMAL",
    },
    {
      min: 21,
      max: 30,
      label: "兴趣倾向明确",
      description:
        "你的职业兴趣倾向比较明确。建议深入了解与你兴趣匹配的职业领域，为未来的职业规划做准备。",
      riskLevel: "NORMAL",
    },
  ],
};

export const ALL_SCALES = [mhtScale, relationshipScale, hollandScale];

export function getScaleById(id: string): AssessmentScale | undefined {
  return ALL_SCALES.find((s) => s.id === id);
}
