import type { BoardData, Card } from "@/types/board";

export function newBoardId() {
  return "board-" + Date.now();
}

export function createEmptyBoard(): BoardData {
  return { id: newBoardId(), name: "New Project", lists: [], cards: {}, labelNames: {}, version: 1, ownerId: null, editors: [] };
}

/** Sort: incomplete cards in original order first, then completed cards by completedAt descending */
export function getSortedCardIds(cardIds: string[], cards: Record<string, Card>) {
  const incomplete = cardIds.filter(id => !cards[id]?.completed);
  const completed = cardIds
    .filter(id => cards[id]?.completed)
    .sort((a, b) => {
      const aTime = cards[a]?.completedAt ? new Date(cards[a].completedAt).getTime() : 0;
      const bTime = cards[b]?.completedAt ? new Date(cards[b].completedAt).getTime() : 0;
      return bTime - aTime; // newest completed first
    });
  return [...incomplete, ...completed];
}

export function getVisibleCardIds(cardIds: string[], cards: Record<string, Card>, hideCompleted: boolean, selectedLabels?: Set<string>) {
  const sorted = getSortedCardIds(cardIds, cards);
  return sorted.filter(id => {
    const card = cards[id];
    if (!card) return false;
    if (hideCompleted && card.completed) return false;
    if (selectedLabels && selectedLabels.size > 0 && !card.labels.some(l => selectedLabels.has(l))) return false;
    return true;
  });
}

export function getListForCard(board: BoardData, cardId: string) {
  return board.lists.find(l => l.cardIds.includes(cardId));
}

export function getLabelName(board: BoardData, color: string) {
  return board.labelNames?.[color] || "";
}
