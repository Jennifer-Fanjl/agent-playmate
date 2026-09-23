export type RobotGamePayload = {
  gameId: "tic_tac_toe";
  difficulty: "easy" | "normal" | "hard";
  playerFirst: boolean;
};

export type RobotCommandRequest = {
  sessionId: string;
  command: "start_game";
  payload: RobotGamePayload;
};

export type RobotCommandResponse = {
  accepted: boolean;
  mode: "mock" | "bridge";
  commandId: string;
  status: "queued" | "sent" | "failed";
  message: string;
};
