import { sendRobotCommand } from "@/lib/robot/bridge";
import type { RobotCommandRequest } from "@/lib/robot/types";

const validDifficulties = new Set(["easy", "normal", "hard"]);

function isRobotCommandRequest(value: unknown): value is RobotCommandRequest {
  if (!value || typeof value !== "object") return false;

  const request = value as Partial<RobotCommandRequest>;
  const payload = request.payload;

  return Boolean(
    typeof request.sessionId === "string" &&
      request.sessionId.trim().length > 0 &&
      request.sessionId.length <= 128 &&
      request.command === "start_game" &&
      payload &&
      payload.gameId === "tic_tac_toe" &&
      validDifficulties.has(payload.difficulty) &&
      typeof payload.playerFirst === "boolean",
  );
}

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();

    if (!isRobotCommandRequest(payload)) {
      return Response.json(
        { error: "机械臂指令格式不正确。" },
        { status: 400 },
      );
    }

    const result = await sendRobotCommand({
      ...payload,
      sessionId: payload.sessionId.trim(),
    });

    return Response.json(result, { status: result.accepted ? 200 : 502 });
  } catch {
    return Response.json(
      { error: "机械臂指令暂时无法处理。" },
      { status: 500 },
    );
  }
}
