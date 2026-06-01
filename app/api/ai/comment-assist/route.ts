import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { streamDeepSeek } from "@/lib/deepseek";
import { buildCommentPrompt } from "@/lib/prompts/comment-assist";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role === "STUDENT") {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { studentName, keywords, commentType, semester, subject } = body;

    if (!studentName || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new Response("缺少必要参数", { status: 400 });
    }

    const prompt = buildCommentPrompt({
      studentName,
      keywords,
      commentType: commentType || "HOMEROOM",
      semester: semester || "2024-2025-1",
      subject,
    });

    const stream = streamDeepSeek([
      { role: "system", content: "你是一位资深中学教师，擅长撰写温暖而具体的学生评语。" },
      { role: "user", content: prompt },
    ]);

    // 转换为 SSE 响应
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk }) }\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI 评语生成错误:", error);
    return new Response("生成失败，请检查 DeepSeek API 配置", { status: 500 });
  }
}
