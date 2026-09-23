import { enrichWithDeepSeek } from "@/lib/agent/deepseek";
import { respondToUser } from "@/lib/agent/engine";
import type { AgentRequest } from "@/lib/agent/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as AgentRequest;
    const message = payload.message?.trim() ?? "";

    if (message.length > 500) {
      return Response.json({ error: "消息长度不能超过 500 个字符。" }, { status: 400 });
    }

    const input = {
      ...payload,
      message,
      history: payload.history?.slice(-8),
    };
    const ruleResponse = respondToUser(input);

    return Response.json(await enrichWithDeepSeek(input, ruleResponse));
  } catch {
    return Response.json(
      { error: "Agent 暂时没有响应，请稍后再试。" },
      { status: 500 },
    );
  }
}
