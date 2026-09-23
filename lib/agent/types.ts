export type AgentIntent =
  | "greeting"
  | "small_talk"
  | "seek_companionship"
  | "request_recommendation"
  | "select_game"
  | "game_move"
  | "accept_recommendation"
  | "reject_recommendation"
  | "ask_rules"
  | "pause_game"
  | "end_game"
  | "unknown";

export type AgentPhase =
  | "welcome"
  | "chatting"
  | "recommending"
  | "confirmed"
  | "playing"
  | "finished";

export type GameDefinition = {
  id: string;
  name: string;
  summary: string;
  description: string;
  objective: string;
  players: string;
  materials: string[];
  durationMinutes: number;
  difficulty: "轻松" | "普通" | "进阶";
  tags: string[];
  keywords: string[];
  playMode: "robot" | "conversation" | "planned";
  supportedByRobot: boolean;
  setup: string[];
  rules: string[];
  winCondition: string;
  recommendWhen: string[];
  avoidWhen: string[];
  hostFlow: string[];
  limitations: string[];
  openingLine?: string;
  tool: string | null;
};

export type GameRecommendation = Pick<
  GameDefinition,
  | "id"
  | "name"
  | "summary"
  | "durationMinutes"
  | "difficulty"
  | "tags"
  | "playMode"
>;

export type AgentAction =
  | {
      type: "start_game";
      payload: {
        gameId: string;
        difficulty: "easy" | "normal" | "hard";
        playerFirst: boolean;
      };
    }
  | {
      type: "start_conversation_game";
      payload: { gameId: string };
    }
  | { type: "none" };

export type AgentRequest = {
  sessionId?: string;
  nickname?: string;
  message?: string;
  phase?: AgentPhase;
  activeGameId?: string | null;
  history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
};

export type AgentResponse = {
  intent: AgentIntent;
  emotion: "neutral" | "bored" | "happy" | "uncertain";
  reply: string;
  phase: AgentPhase;
  recommendation: GameRecommendation | null;
  action: AgentAction;
  source: "rules" | "llm";
};
