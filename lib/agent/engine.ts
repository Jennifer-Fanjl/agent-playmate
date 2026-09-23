import {
  findGameInMessage,
  getExecutableGames,
  getGame,
  recommendGame,
} from "./game-catalog";
import type {
  AgentIntent,
  AgentRequest,
  AgentResponse,
  GameDefinition,
} from "./types";

const patterns = {
  accept: ["好", "可以", "开始", "来吧", "就这个", "想玩", "没问题", "行"],
  reject: ["不想", "不要", "算了", "拒绝", "换一个", "别玩"],
  recommend: [
    "无聊",
    "不知道玩什么",
    "推荐",
    "陪我",
    "陪玩",
    "玩点什么",
    "有啥好玩",
    "时间不多",
    "分钟",
    "快速",
    "很快",
    "没道具",
    "不用道具",
    "不想用道具",
  ],
  rules: ["怎么玩", "玩法", "规则", "怎么下", "介绍一下"],
  pause: ["暂停", "等一下", "先停"],
  end: ["结束", "退出", "不玩了", "停下"],
  greeting: ["你好", "嗨", "哈喽", "hello", "在吗"],
  happy: ["开心", "高兴", "不错", "好耶"],
  bored: ["无聊", "没意思", "没事做", "发呆"],
};

type RockPaperScissorsMove = "石头" | "剪刀" | "布";
const rockPaperScissorsMoves: RockPaperScissorsMove[] = ["石头", "剪刀", "布"];

function parseRockPaperScissorsMove(message: string): RockPaperScissorsMove | null {
  const normalized = message
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s，。！？、,.!?]/g, "");
  const match = normalized.match(
    /^(?:我)?(?:这局|这把)?(?:要|想|就|会)?(?:出|选|选择|用)?(?:的是)?(石头|剪刀|布)(?:吧|了|哦|呀|啊)?$/,
  );
  return (match?.[1] as RockPaperScissorsMove | undefined) ?? null;
}

function resolveRockPaperScissorsRound(playerMove: RockPaperScissorsMove) {
  const agentMove =
    rockPaperScissorsMoves[Math.floor(Math.random() * rockPaperScissorsMoves.length)];
  const playerWins =
    (playerMove === "石头" && agentMove === "剪刀") ||
    (playerMove === "剪刀" && agentMove === "布") ||
    (playerMove === "布" && agentMove === "石头");
  const result =
    playerMove === agentMove ? "平局" : playerWins ? "你赢了" : "这一轮我赢了";

  return `你出${playerMove}，我出${agentMove}——${result}！再来一轮吗？直接告诉我你要出什么。`;
}

function includesAny(message: string, candidates: string[]) {
  return candidates.some((candidate) => message.includes(candidate));
}

function classifyIntent(message: string, phase: AgentRequest["phase"]): AgentIntent {
  const normalized = message.trim().toLowerCase();

  if (includesAny(normalized, patterns.pause)) return "pause_game";
  if (includesAny(normalized, patterns.end)) return "end_game";
  if (includesAny(normalized, patterns.reject)) return "reject_recommendation";
  if (includesAny(normalized, patterns.rules)) return "ask_rules";
  if (phase === "recommending" && includesAny(normalized, patterns.accept)) {
    return "accept_recommendation";
  }
  if (findGameInMessage(normalized)) return "select_game";
  if (includesAny(normalized, patterns.recommend)) return "request_recommendation";
  if (includesAny(normalized, patterns.greeting)) return "greeting";
  if (normalized.length <= 2) return "unknown";
  return "small_talk";
}

function inferEmotion(message: string): AgentResponse["emotion"] {
  if (includesAny(message, patterns.bored)) return "bored";
  if (includesAny(message, patterns.happy)) return "happy";
  if (message.includes("不知道") || message.includes("随便")) return "uncertain";
  return "neutral";
}

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

export function respondToUser(input: AgentRequest): AgentResponse {
  const nickname = input.nickname?.trim() || "朋友";
  const message = input.message?.trim() || "";
  const phase = input.phase ?? "chatting";
  const emotion = inferEmotion(message);
  const executableGame = getExecutableGames()[0];
  const selectedGame = findGameInMessage(message);
  const contextualGame = recommendGame(input) ?? executableGame;
  const activeGame = selectedGame ?? getGame(input.activeGameId) ?? contextualGame;
  const emptyAction = { type: "none" } as const;

  if (!message) {
    return {
      intent: "unknown",
      emotion: "neutral",
      reply: "我没有听清楚。你可以再说一次，或者告诉我现在想轻松一下还是认真对弈。",
      phase,
      recommendation: null,
      action: emptyAction,
      source: "rules",
    };
  }

  const rockPaperScissorsMove =
    activeGame.id === "rock_paper_scissors" &&
    (phase === "recommending" || phase === "playing")
      ? parseRockPaperScissorsMove(message)
      : null;

  if (rockPaperScissorsMove) {
    return {
      intent: "game_move",
      emotion: "happy",
      reply: resolveRockPaperScissorsRound(rockPaperScissorsMove),
      phase: "playing",
      recommendation: toRecommendation(activeGame),
      action:
        phase === "recommending"
          ? {
              type: "start_conversation_game",
              payload: { gameId: activeGame.id },
            }
          : emptyAction,
      source: "rules",
    };
  }

  const intent = classifyIntent(message, phase);

  switch (intent) {
    case "greeting":
      return {
        intent,
        emotion,
        reply: `嗨，${nickname}！我在呢。想直接来一局，还是让我根据你的状态推荐一个？`,
        phase: "chatting",
        recommendation: null,
        action: emptyAction,
        source: "rules",
      };

    case "request_recommendation":
    case "seek_companionship":
      return {
        intent,
        emotion,
        reply: `我根据你刚才说的内容，先推荐${contextualGame.name}：${contextualGame.summary}想试试吗？`,
        phase: "recommending",
        recommendation: toRecommendation(contextualGame),
        action: emptyAction,
        source: "rules",
      };

    case "select_game":
      if (selectedGame?.playMode === "planned") {
        return {
          intent,
          emotion,
          reply: `${selectedGame.name}已经收录在玩法库里，但当前版本还不能直接开局。我可以先介绍规则，或者换一个现在能玩的项目。`,
          phase: "recommending",
          recommendation: toRecommendation(selectedGame),
          action: emptyAction,
          source: "rules",
        };
      }
      return {
        intent,
        emotion,
        reply: selectedGame?.playMode === "conversation"
          ? `当然可以！${selectedGame.name}现在就能通过对话玩，要开始吗？`
          : "当然可以！井字棋节奏很快，你想现在开始吗？",
        phase: "recommending",
        recommendation: toRecommendation(selectedGame ?? executableGame),
        action: emptyAction,
        source: "rules",
      };

    case "ask_rules":
      return {
        intent,
        emotion,
        reply: `${activeGame.name}需要${activeGame.materials.join("、")}。目标是${activeGame.objective}${activeGame.rules.join(" ")}结束条件：${activeGame.winCondition}`,
        phase: "recommending",
        recommendation: toRecommendation(activeGame),
        action: emptyAction,
        source: "rules",
      };

    case "accept_recommendation":
      if (activeGame.playMode === "conversation") {
        return {
          intent,
          emotion: "happy",
          reply: activeGame.openingLine ?? `好，我们现在开始${activeGame.name}！`,
          phase: "playing",
          recommendation: toRecommendation(activeGame),
          action: {
            type: "start_conversation_game",
            payload: { gameId: activeGame.id },
          },
          source: "rules",
        };
      }
      if (activeGame.playMode === "planned") {
        return {
          intent,
          emotion,
          reply: `${activeGame.name}目前还在扩展计划中。我们可以先玩井字棋、默契快问快答或石头剪刀布。`,
          phase: "chatting",
          recommendation: null,
          action: emptyAction,
          source: "rules",
        };
      }
      return {
        intent,
        emotion: "happy",
        reply: "好耶，游戏会话已经创建！正在等待机械臂准备，准备好后我会请你先落子。",
        phase: "confirmed",
        recommendation: toRecommendation(activeGame),
        action: {
          type: "start_game",
          payload: {
            gameId: activeGame.id,
            difficulty: "normal",
            playerFirst: true,
          },
        },
        source: "rules",
      };

    case "reject_recommendation":
      const wantsAlternative = includesAny(message, ["换一个", "换点", "别的", "其他"]);
      const alternative = recommendGame(input, activeGame.id);
      return {
        intent,
        emotion,
        reply: wantsAlternative && alternative
          ? `好，那换一个！${alternative.summary}要试试${alternative.name}吗？`
          : "没问题，不勉强你。我们可以先聊聊天，等你想玩时再叫我。",
        phase: wantsAlternative && alternative ? "recommending" : "chatting",
        recommendation: wantsAlternative && alternative ? toRecommendation(alternative) : null,
        action: emptyAction,
        source: "rules",
      };

    case "pause_game":
      return {
        intent,
        emotion,
        reply: "好的，我先暂停游戏。准备继续时告诉我一声。",
        phase: "playing",
        recommendation: null,
        action: emptyAction,
        source: "rules",
      };

    case "end_game":
      return {
        intent,
        emotion,
        reply: "这局先到这里。等你想再玩时，我随时都在。",
        phase: "finished",
        recommendation: null,
        action: emptyAction,
        source: "rules",
      };

    default:
      return {
        intent,
        emotion,
        reply: "我听懂啦。如果你想找点事情一起做，可以说“推荐一个游戏”，我会帮你挑一个现在能玩的。",
        phase: "chatting",
        recommendation: null,
        action: emptyAction,
        source: "rules",
      };
  }
}
