import type {
  RobotCommandRequest,
  RobotCommandResponse,
} from "@/lib/robot/types";

const ROBOT_TIMEOUT_MS = 5_000;

function createCommandId() {
  return `cmd_${crypto.randomUUID()}`;
}

export async function sendRobotCommand(
  command: RobotCommandRequest,
): Promise<RobotCommandResponse> {
  const commandId = createCommandId();
  const bridgeUrl = process.env.ROBOT_BRIDGE_URL?.trim();

  if (!bridgeUrl) {
    return {
      accepted: true,
      mode: "mock",
      commandId,
      status: "queued",
      message: "软件指令已生成，等待配置机械臂服务地址。",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ROBOT_TIMEOUT_MS);
  const token = process.env.ROBOT_BRIDGE_TOKEN?.trim();

  try {
    const response = await fetch(`${bridgeUrl.replace(/\/$/, "")}/commands`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        commandId,
        ...command,
        requestedAt: new Date().toISOString(),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        accepted: false,
        mode: "bridge",
        commandId,
        status: "failed",
        message: `机械臂服务暂未接受指令（${response.status}）。`,
      };
    }

    return {
      accepted: true,
      mode: "bridge",
      commandId,
      status: "sent",
      message: "游戏指令已发送到机械臂服务。",
    };
  } catch {
    return {
      accepted: false,
      mode: "bridge",
      commandId,
      status: "failed",
      message: "机械臂服务暂时无法连接，游戏会话已保留。",
    };
  } finally {
    clearTimeout(timeout);
  }
}
