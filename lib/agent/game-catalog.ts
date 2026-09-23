import {
  findKnowledgeGame,
  gameKnowledgeBase,
  recommendKnowledgeGame,
} from "./knowledge-base";

export const gameCatalog = gameKnowledgeBase;

export function getGame(gameId: string | null | undefined) {
  return gameCatalog.find((game) => game.id === gameId) ?? null;
}

export function getExecutableGames() {
  return gameCatalog.filter((game) => game.supportedByRobot && game.tool);
}

export function getPlayableGames() {
  return gameCatalog.filter((game) => game.playMode !== "planned" && game.tool);
}

export const findGameInMessage = findKnowledgeGame;
export const recommendGame = recommendKnowledgeGame;
