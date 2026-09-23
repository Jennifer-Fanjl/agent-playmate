import type { AgentRequest, GameDefinition } from "./types";

export const gameKnowledgeBase: GameDefinition[] = [
  {
    id: "tic_tac_toe",
    name: "井字棋",
    summary: "两三分钟一局，规则简单但很考验观察力。",
    description: "玩家在实体九宫格落子，机械臂通过视觉识别棋盘并完成回应。",
    objective: "率先让自己的三个棋子横向、纵向或斜向连成一线。",
    players: "1 位用户 + 机械臂",
    materials: ["九宫格棋盘", "两组可区分棋子", "视觉摄像头", "机械臂夹爪"],
    durationMinutes: 3,
    difficulty: "轻松",
    tags: ["益智", "短时", "棋类", "双人", "轻松"],
    keywords: ["井字棋", "三子棋", "九宫格", "下棋", "对弈"],
    playMode: "robot",
    supportedByRobot: true,
    setup: ["清空九宫格。", "确认用户与机械臂使用不同棋子。", "默认邀请用户先手。"],
    rules: [
      "玩家与机械臂轮流落一枚棋子，落子后不可移动。",
      "已经有棋子的格子不能重复落子。",
      "横向、纵向或斜向率先连成三个棋子即可获胜。",
      "九个格子用完仍无人连线时，本局为平局。",
    ],
    winCondition: "任意一方先形成连续三子即结束；棋盘填满则平局。",
    recommendWhen: ["想快速开始", "喜欢棋类或策略", "愿意进行实体操作", "希望体验机械臂"],
    avoidWhen: ["用户不方便伸手落子", "机械臂或视觉系统未就绪"],
    hostFlow: ["介绍先后手。", "等待用户真实落子。", "读取视觉结果并校验。", "发送机械臂落子指令。", "判断胜负并邀请再来一局。"],
    limitations: ["当前仅创建标准化启动指令；真实落子依赖机械臂桥接服务、摄像头和标定结果。"],
    tool: "start_tic_tac_toe",
  },
  {
    id: "rock_paper_scissors",
    name: "石头剪刀布",
    summary: "节奏很快，适合轻松热身。",
    description: "用户通过文字选择手势，Agent 同步给出选择并判断胜负。",
    objective: "使用石头、剪刀和布的克制关系赢得本轮。",
    players: "1 位用户 + Agent",
    materials: ["无需道具"],
    durationMinutes: 2,
    difficulty: "轻松",
    tags: ["快速", "轻松", "双人", "无道具"],
    keywords: ["石头剪刀布", "猜拳", "出拳", "热身"],
    playMode: "conversation",
    supportedByRobot: false,
    setup: ["说明可选择石头、剪刀或布。", "约定一局定胜负或三局两胜。"],
    rules: ["石头胜剪刀，剪刀胜布，布胜石头。", "双方选择相同则本轮平局。"],
    winCondition: "单局获胜或在三局两胜中先赢两局。",
    recommendWhen: ["只有一两分钟", "想轻松热身", "不想思考复杂规则"],
    avoidWhen: ["用户希望认真策略对弈", "用户要求实体机械臂互动"],
    hostFlow: ["确认局数。", "邀请用户出拳。", "Agent 生成自己的选择。", "公布结果与比分。", "询问是否继续。"],
    limitations: ["当前由对话主持，不调用机械臂。"],
    openingLine: "准备好了吗？请直接告诉我你要出石头、剪刀还是布，我会同时亮出我的选择。",
    tool: "chat_rock_paper_scissors",
  },
  {
    id: "quick_quiz",
    name: "默契快问快答",
    summary: "通过几个轻松选择题，让我更快了解你的偏好。",
    description: "Agent 连续提出轻松的二选一问题，并把回答用于后续陪玩推荐。",
    objective: "在轻松互动中收集用户偏好，让后续推荐更贴合。",
    players: "1 位用户 + Agent",
    materials: ["无需道具"],
    durationMinutes: 4,
    difficulty: "轻松",
    tags: ["了解偏好", "聊天", "全年龄", "无输赢"],
    keywords: ["快问快答", "默契", "选择题", "了解我", "偏好"],
    playMode: "conversation",
    supportedByRobot: false,
    setup: ["告诉用户没有标准答案，按第一感觉回答即可。"],
    rules: ["每轮从两个选项中选择一个。", "连续回答三到五题。", "Agent 总结偏好并给出下一项陪玩建议。"],
    winCondition: "没有输赢；完成一组问题并形成可解释的偏好摘要即结束。",
    recommendWhen: ["用户不知道想玩什么", "首次见面", "历史偏好不足", "用户愿意聊天"],
    avoidWhen: ["用户想立刻开始明确指定的游戏", "用户不想回答个人偏好问题"],
    hostFlow: ["说明玩法。", "依次提出二选一。", "简短回应每个选择。", "总结偏好。", "根据偏好推荐游戏。"],
    limitations: ["偏好只用于陪玩推荐，不推断敏感个人信息。"],
    openingLine: "默契测试开始！第一题：你现在更想要“安静动脑”，还是“热闹互动”？",
    tool: "chat_quick_quiz",
  },
  {
    id: "number_guess",
    name: "猜数字",
    summary: "通过大小提示逐步锁定答案，规则直观又有一点策略。",
    description: "Agent 在指定范围内确定一个数字，用户通过连续猜测和大小提示寻找答案。",
    objective: "用尽量少的次数猜中目标数字。",
    players: "1 位用户 + Agent",
    materials: ["无需道具"],
    durationMinutes: 4,
    difficulty: "普通",
    tags: ["数字", "推理", "短时", "无道具"],
    keywords: ["猜数字", "数字游戏", "大小提示", "推理"],
    playMode: "conversation",
    supportedByRobot: false,
    setup: ["默认范围为 1 到 20。", "说明每次会得到偏大或偏小提示。"],
    rules: ["Agent 确定范围内的目标数字。", "用户每轮猜一个整数。", "Agent 只反馈偏大、偏小或正确。"],
    winCondition: "用户在限定次数内猜中目标数字。",
    recommendWhen: ["喜欢数字或推理", "想玩规则明确的短游戏", "不需要实体道具"],
    avoidWhen: ["用户不喜欢数字", "用户更想自由聊天"],
    hostFlow: ["公布范围和次数。", "记录目标数字。", "逐轮反馈大小。", "猜中后公布次数。", "询问是否扩大范围。"],
    limitations: ["当前由对话状态维持目标数字，刷新页面会重新开始。"],
    openingLine: "我已经想好了一个 1 到 20 的整数。你有 5 次机会，先猜一个吧！",
    tool: "chat_number_guess",
  },
  {
    id: "story_chain",
    name: "故事接龙",
    summary: "一句接一句共同编故事，适合喜欢想象和轻松聊天的用户。",
    description: "Agent 与用户轮流补充一到两句话，共同完成一个全年龄短故事。",
    objective: "合作完成一个连贯、有趣且适合全年龄用户的短故事。",
    players: "1 位或多位用户 + Agent",
    materials: ["无需道具"],
    durationMinutes: 8,
    difficulty: "轻松",
    tags: ["创意", "聊天", "合作", "无输赢"],
    keywords: ["故事接龙", "编故事", "想象", "创作"],
    playMode: "conversation",
    supportedByRobot: false,
    setup: ["选择科幻、冒险或日常等全年龄主题。", "约定每轮补充一到两句话。"],
    rules: ["双方轮流续写。", "每轮保持人物与情节连续。", "不加入暴力、色情或其他不适合全年龄的内容。"],
    winCondition: "没有输赢；故事形成一个有开端、发展和结尾的完整段落即完成。",
    recommendWhen: ["想自由聊天", "喜欢想象和创作", "不在意输赢"],
    avoidWhen: ["用户想要快速决出胜负", "用户只想玩实体棋类"],
    hostFlow: ["确认主题。", "Agent 给出开场。", "轮流续写。", "适时总结情节。", "邀请用户决定结局。"],
    limitations: ["需要保持上下文连贯，长对话会压缩较早情节。"],
    openingLine: "选一个开场吧：赛博城市、神秘森林，还是校园日常？你选好后我来写第一句。",
    tool: "chat_story_chain",
  },
  {
    id: "gomoku",
    name: "五子棋",
    summary: "更有策略感，适合想认真对弈的时候。",
    description: "双方轮流落子，率先让五枚棋子连成一线的一方获胜。",
    objective: "率先形成横向、纵向或斜向连续五子。",
    players: "1 位用户 + 机械臂",
    materials: ["五子棋盘", "黑白棋子", "视觉摄像头", "机械臂夹爪"],
    durationMinutes: 15,
    difficulty: "进阶",
    tags: ["策略", "棋类", "双人", "长时"],
    keywords: ["五子棋", "连五", "黑白棋子", "策略对弈"],
    playMode: "planned",
    supportedByRobot: false,
    setup: ["摆放棋盘并完成相机和机械臂标定。"],
    rules: ["双方轮流在空交叉点落子。", "率先形成连续五子的一方获胜。"],
    winCondition: "任意方向形成连续五子。",
    recommendWhen: ["喜欢较长时间的策略对弈"],
    avoidWhen: ["只有几分钟", "当前 MVP 现场演示"],
    hostFlow: ["当前仅介绍玩法，不创建游戏指令。"],
    limitations: ["未完成视觉棋盘识别、路径规划和机械臂执行适配，当前不可开局。"],
    tool: null,
  },
];

const aliases: Record<string, string[]> = Object.fromEntries(
  gameKnowledgeBase.map((game) => [game.id, [game.name, ...game.keywords]]),
);

function normalizedText(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function findKnowledgeGame(message: string) {
  const text = normalizedText(message);
  return (
    gameKnowledgeBase.find((game) =>
      aliases[game.id].some((alias) => text.includes(normalizedText(alias))),
    ) ?? null
  );
}

export function recommendKnowledgeGame(
  input: Pick<AgentRequest, "message" | "history">,
  excludeGameId?: string | null,
) {
  const context = [
    ...(input.history ?? [])
      .filter((item) => item.role === "user")
      .slice(-6)
      .map((item) => item.content),
    input.message ?? "",
  ].join(" ");
  const text = normalizedText(context);
  const playable = gameKnowledgeBase.filter(
    (game) => game.playMode !== "planned" && game.tool && game.id !== excludeGameId,
  );

  const scored = playable.map((game, index) => {
    let score = -index * 0.01;
    for (const keyword of [...game.keywords, ...game.tags]) {
      if (text.includes(normalizedText(keyword))) score += 5;
    }
    for (const signal of game.recommendWhen) {
      for (const token of signal.split(/[、，或与 ]/).filter((item) => item.length >= 2)) {
        if (text.includes(normalizedText(token))) score += 2;
      }
    }
    for (const signal of game.avoidWhen) {
      for (const token of signal.split(/[、，或与 ]/).filter((item) => item.length >= 2)) {
        if (text.includes(normalizedText(token))) score -= 3;
      }
    }

    if (/无聊|没事做|不知道|随便/.test(text) && game.id === "quick_quiz") score += 4;
    if (/很快|快点|马上|一分钟|两分钟/.test(text) && game.id === "rock_paper_scissors") score += 6;
    if (/认真|策略|下棋|对弈/.test(text) && game.id === "tic_tac_toe") score += 6;
    if (/认识我|了解我|选择题|偏好/.test(text) && game.id === "quick_quiz") score += 6;
    if (/故事|想象|创作/.test(text) && game.id === "story_chain") score += 6;
    if (/数字|推理/.test(text) && game.id === "number_guess") score += 6;

    return { game, score };
  });

  return scored.sort((left, right) => right.score - left.score)[0]?.game ?? null;
}

export function formatGameKnowledge(game: GameDefinition) {
  const availability =
    game.playMode === "robot"
      ? "机械臂游戏，可创建启动指令"
      : game.playMode === "conversation"
        ? "对话游戏，可立即开始"
        : "扩展计划，仅可介绍玩法";

  return [
    `${game.id}｜${game.name}｜${availability}`,
    `简介：${game.description}`,
    `目标：${game.objective}`,
    `人数：${game.players}；时长：约${game.durationMinutes}分钟；难度：${game.difficulty}`,
    `材料：${game.materials.join("、")}`,
    `准备：${game.setup.join(" ")}`,
    `规则：${game.rules.join(" ")}`,
    `结束条件：${game.winCondition}`,
    `适合：${game.recommendWhen.join("、")}`,
    `不建议：${game.avoidWhen.join("、")}`,
    `主持流程：${game.hostFlow.join(" ")}`,
    `限制：${game.limitations.join(" ")}`,
  ].join("\n");
}

export function buildKnowledgeContext(message: string, activeGameId?: string | null) {
  const matched = findKnowledgeGame(message);
  return [...gameKnowledgeBase]
    .sort((left, right) => {
      const score = (game: GameDefinition) =>
        (game.id === matched?.id ? 4 : 0) +
        (game.id === activeGameId ? 3 : 0) +
        (game.playMode === "planned" ? 0 : 1);
      return score(right) - score(left);
    })
    .map(formatGameKnowledge)
    .join("\n\n");
}
