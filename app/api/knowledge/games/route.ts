import { NextRequest, NextResponse } from "next/server";

import { getGame } from "@/lib/agent/game-catalog";
import { gameKnowledgeBase } from "@/lib/agent/knowledge-base";

export async function GET(request: NextRequest) {
  const gameId = request.nextUrl.searchParams.get("id");

  if (gameId) {
    const game = getGame(gameId);
    if (!game) {
      return NextResponse.json(
        { error: "未找到对应的玩法知识条目。" },
        { status: 404 },
      );
    }

    return NextResponse.json({ version: "2026-09-23", game });
  }

  return NextResponse.json({
    version: "2026-09-23",
    total: gameKnowledgeBase.length,
    games: gameKnowledgeBase,
  });
}
