import { describe, it, expect } from "vitest";
import {
  createEmptyBoard,
  getSortedCardIds,
  getVisibleCardIds,
  getListForCard,
  getLabelName,
} from "./board-utils";
import type { Card, BoardData } from "@/types/board";

function makeCard(overrides: Partial<Card> & { id: string }): Card {
  return {
    title: "",
    description: "",
    labels: [],
    startDate: "",
    dueDate: "",
    completed: false,
    completedAt: "",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("createEmptyBoard", () => {
  it("returns a board with correct default structure", () => {
    const board = createEmptyBoard();
    expect(board.id).toMatch(/^board-\d+$/);
    expect(board.name).toBe("New Project");
    expect(board.lists).toEqual([]);
    expect(board.cards).toEqual({});
    expect(board.labelNames).toEqual({});
    expect(board.version).toBe(1);
  });

  it("generates unique IDs when called at different times", async () => {
    const a = createEmptyBoard();
    await new Promise(r => setTimeout(r, 2));
    const b = createEmptyBoard();
    expect(a.id).not.toBe(b.id);
  });
});

describe("getSortedCardIds", () => {
  it("puts incomplete cards first in original order", () => {
    const cards: Record<string, Card> = {
      c1: makeCard({ id: "c1", completed: false }),
      c2: makeCard({ id: "c2", completed: false }),
    };
    expect(getSortedCardIds(["c1", "c2"], cards)).toEqual(["c1", "c2"]);
  });

  it("puts completed cards after incomplete, sorted by completedAt descending", () => {
    const cards: Record<string, Card> = {
      c1: makeCard({ id: "c1", completed: true, completedAt: "2024-01-01T00:00:00Z" }),
      c2: makeCard({ id: "c2", completed: false }),
      c3: makeCard({ id: "c3", completed: true, completedAt: "2024-06-01T00:00:00Z" }),
    };
    const result = getSortedCardIds(["c1", "c2", "c3"], cards);
    expect(result).toEqual(["c2", "c3", "c1"]); // incomplete first, then newest completed
  });

  it("handles empty card list", () => {
    expect(getSortedCardIds([], {})).toEqual([]);
  });

  it("handles cards with missing completedAt", () => {
    const cards: Record<string, Card> = {
      c1: makeCard({ id: "c1", completed: true, completedAt: "" }),
      c2: makeCard({ id: "c2", completed: true, completedAt: "2024-01-01T00:00:00Z" }),
    };
    const result = getSortedCardIds(["c1", "c2"], cards);
    expect(result).toEqual(["c2", "c1"]);
  });
});

describe("getVisibleCardIds", () => {
  const cards: Record<string, Card> = {
    c1: makeCard({ id: "c1", completed: true, completedAt: "2024-01-01T00:00:00Z" }),
    c2: makeCard({ id: "c2", completed: false }),
    c3: makeCard({ id: "c3", completed: false }),
  };

  it("returns all cards when hideCompleted is false", () => {
    const result = getVisibleCardIds(["c1", "c2", "c3"], cards, false);
    expect(result).toEqual(["c2", "c3", "c1"]);
  });

  it("filters completed cards when hideCompleted is true", () => {
    const result = getVisibleCardIds(["c1", "c2", "c3"], cards, true);
    expect(result).toEqual(["c2", "c3"]);
  });
});

describe("getListForCard", () => {
  const board: BoardData = {
    id: "board-1",
    name: "Test",
    lists: [
      { id: "list-1", title: "Todo", cardIds: ["c1", "c2"] },
      { id: "list-2", title: "Done", cardIds: ["c3"] },
    ],
    cards: {},
    labelNames: {},
    version: 1,
  };

  it("finds the correct list for a card", () => {
    expect(getListForCard(board, "c3")?.id).toBe("list-2");
    expect(getListForCard(board, "c1")?.id).toBe("list-1");
  });

  it("returns undefined for unknown card", () => {
    expect(getListForCard(board, "c999")).toBeUndefined();
  });
});

describe("getLabelName", () => {
  const board: BoardData = {
    id: "board-1",
    name: "Test",
    lists: [],
    cards: {},
    labelNames: { green: "Priority", red: "Bug" },
    version: 1,
  };

  it("returns label name when it exists", () => {
    expect(getLabelName(board, "green")).toBe("Priority");
    expect(getLabelName(board, "red")).toBe("Bug");
  });

  it("returns empty string for unknown color", () => {
    expect(getLabelName(board, "blue")).toBe("");
  });

  it("returns empty string when labelNames is empty", () => {
    const emptyBoard: BoardData = { ...board, labelNames: {}, version: 1 };
    expect(getLabelName(emptyBoard, "green")).toBe("");
  });
});
