/**
 * AI 评语助手提示词模板
 * 用于 DeepSeek 生成教师评语
 */

export function buildCommentPrompt(params: {
  studentName: string;
  keywords: string[];
  commentType: string;
  semester: string;
  subject?: string;
}): string {
  const { studentName, keywords, commentType, semester, subject } = params;

  const typeMap: Record<string, string> = {
    SUBJECT: "学科评语",
    HOMEROOM: "班主任评语",
    INSTANT: "即时反馈",
    STAGE: "阶段性评语",
  };

  const typeLabel = typeMap[commentType] || "评语";
  const subjectHint = subject ? `（${subject}学科）` : "";

  return `你是一位资深中学教师，拥有20年教学经验，擅长用温暖而具体的语言写学生评语。

请为以下学生撰写一段${typeLabel}${subjectHint}：

【学生姓名】${studentName}
【学期】${semester}
【关键词/维度】${keywords.join("、")}

要求：
1. 语言温暖真诚，体现教师对学生的关心和期望
2. 结合关键词展开具体描述，避免空洞套话
3. 既有肯定也有建设性建议（比例约 7:3）
4. 篇幅控制在 100-200 字
5. 符合中国教育场景和价值观
6. 直接输出评语正文，不要加标题、署名或日期

请生成评语：`;
}
