import { getGame } from "./game-catalog";
import { buildKnowledgeContext } from "./knowledge-base";
import type {
  AgentIntent,
  AgentRequest,
  AgentResponse,
  GameDefinition,
} from "./types";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-flash";

const llmIntents = new Set<AgentIntent>([
  "greeting",
  "small_talk",
  "seek_companionship",
  "request_recommendation",
  "select_game",
  "reject_recommendation",
  "ask_rules",
  "unknown",
]);

const ruleOnlyIntents = new Set<AgentIntent>([
  "accept_recommendation",
  "pause_game",
  "end_game",
]);

type DeepSeekDecision = {
  intent?: AgentIntent;
  emotion?: AgentResponse["emotion"];
  reply?: string;
  recommendedGameId?: string | null;
};

function toRecommendation(game: GameDefinition) {
  return {
    id: game.id,
    name: game.name,
    summary: game.summary,
    durationMinutes: game.durationMinutes,
    difficulty: game.difficulty,
    tags: game.tags,
    playMode: game.playMode,
  };
}

function parseDecision(content: string): DeepSeekDecision | null {
  try {
    const normalized = content
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");
    return JSON.parse(normalized) as DeepSeekDecision;
  } catch {
    return null;
  }
}

export async function enrichWithDeepSeek(
  input: AgentRequest,
  ruleResponse: AgentResponse,
): Promise<AgentResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (
    !apiKey ||
    ruleOnlyIntents.has(ruleResponse.intent) ||
    ruleResponse.action.type !== "none"
  ) {
    return ruleResponse;
  }

  const gameKnowledge = buildKnowledgeContext(
    input.message ?? "",
    input.activeGameId,
  );
  const nickname = input.nickname?.trim() || "朋友";
  const history = (input.history ?? [])
    .slice(-8)
    .filter((item) => item.content.trim())
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 500),
    }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        thinking: { type: "disabled" },
        temperature: 0.8,
        max_tokens: 300,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `你是一个活泼、友好、全年龄适用的陪玩机器人 Agent。用户昵称是${nickname}。你的首要任务是自然对话、理解情绪和陪伴用户，不要每句话都导向游戏。

游戏知识库：
${gameKnowledge}

当前规则引擎识别结果是 ${ruleResponse.intent}，会话阶段是 ${input.phase ?? "chatting"}，当前项目是 ${input.activeGameId ?? "无"}。
知识库是玩法事实的唯一来源，不要编造其中没有的规则、材料、可用状态或机械臂能力。根据用户的心情、可用时长、是否愿意使用道具、策略偏好和最近对话选择项目，并用知识库中的“适合/不建议”解释选择。用户明确说“换一个、换点别的”时，必须避开当前项目，并优先选择可立即开始的项目；如果只是拒绝而没有要求替代，不要强推新项目。用户想玩尚未开放的项目时，可以介绍玩法，但要明确当前不可开始。不要声称机械臂已经准备好，不要自行开始游戏。
如果会话阶段是 playing 且当前项目是对话互动，应继续主持该项目，根据用户回答推进下一轮，不要突然重新推荐游戏。

回复要自然、有承接感，通常不超过100个汉字。只有确实要展示推荐卡时才填写 recommendedGameId，否则填 null。只输出 JSON，格式为 {"intent":"small_talk|greeting|seek_companionship|request_recommendation|select_game|reject_recommendation|ask_rules|unknown","emotion":"neutral|bored|happy|uncertain","reply":"回复内容","recommendedGameId":"知识库中的id或null"}。`,
          },
          ...history,
          { role: "user", content: input.message?.slice(0, 500) || "" },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) return ruleResponse;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return ruleResponse;

    const decision = parseDecision(content);
    if (!decision?.reply?.trim()) return ruleResponse;

    const intent =
      decision.intent && llmIntents.has(decision.intent)
        ? decision.intent
        : ruleResponse.intent;
    const emotion = ["neutral", "bored", "happy", "uncertain"].includes(
      decision.emotion ?? "",
    )
      ? decision.emotion!
      : ruleResponse.emotion;
    const preserveRuleIntent = !["small_talk", "unknown", "greeting"].includes(
      ruleResponse.intent,
    );
    const requestedGame = decision.recommendedGameId
      ? getGame(decision.recommendedGameId)
      : null;
    const activeGameId = input.activeGameId ?? null;
    const requestedGameIsAllowed = Boolean(
      requestedGame &&
        requestedGame.playMode !== "planned" &&
        !(
          ruleResponse.intent === "reject_recommendation" &&
          requestedGame.id === activeGameId
        ),
    );
    const recommendation = requestedGameIsAllowed
      ? toRecommendation(requestedGame!)
      : ruleResponse.recommendation;
    const phase =
      ruleResponse.intent === "reject_recommendation"
        ? recommendation
          ? "recommending"
          : "chatting"
        : ruleResponse.recommendation
          ? ruleResponse.phase
          : recommendation
            ? "recommending"
            : "chatting";

    return {
      intent: preserveRuleIntent ? ruleResponse.intent : intent,
      emotion,
      reply: decision.reply.trim().slice(0, 240),
      phase,
      recommendation,
      action: ruleResponse.action,
      source: "llm",
    };
  } catch {
    return ruleResponse;
  } finally {
    clearTimeout(timeout);
  }
}
