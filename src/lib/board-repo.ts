import { getDb, initSchema } from "./db";
import type { BoardData } from "@/types/board";
import { DEMO_BOARDS } from "./demo-boards";

export async function getBoard(id: string): Promise<BoardData | null> {
  await initSchema();
  const db = getDb();
  const row = await db.execute({ sql: "SELECT data FROM boards WHERE id = ?", args: [id] });
  if (row.rows.length === 0) return null;
  const board: BoardData = JSON.parse(row.rows[0].data as string);
  // Backfill auth fields
  if (board.ownerId === undefined) board.ownerId = null;
  if (!board.editors) board.editors = [];
  return board;
}

export async function listBoardsForUser(userId: string): Promise<{ id: string; name: string; ownerId: string | null; isOwner: boolean }[]> {
  await initSchema();
  const db = getDb();
  const result = await db.execute("SELECT data FROM boards");
  const boards: { id: string; name: string; ownerId: string | null; isOwner: boolean }[] = [];

  for (const row of result.rows) {
    const data = JSON.parse(row.data as string);
    const ownerId: string | null = data.ownerId ?? null;
    const editors: string[] = data.editors ?? [];

    if (ownerId === null || ownerId === userId || editors.includes(userId)) {
      boards.push({
        id: data.id,
        name: data.name || "Untitled",
        ownerId,
        isOwner: ownerId === userId,
      });
    }
  }

  return boards;
}

export async function saveBoard(board: BoardData): Promise<void> {
  await initSchema();
  const db = getDb();
  await db.execute({
    sql: "INSERT OR REPLACE INTO boards (id, data, owner_id, updated_at) VALUES (?, ?, ?, datetime('now'))",
    args: [board.id, JSON.stringify(board), board.ownerId ?? null],
  });
}

export async function deleteBoard(id: string): Promise<void> {
  await initSchema();
  const db = getDb();
  await db.execute({ sql: "DELETE FROM boards WHERE id = ?", args: [id] });
}

let demoSeeded = false;

export async function seedDemoBoards(): Promise<void> {
  if (demoSeeded) return;
  await initSchema();
  const db = getDb();

  for (const board of DEMO_BOARDS) {
    const existing = await db.execute({ sql: "SELECT id FROM boards WHERE id = ?", args: [board.id] });
    if (existing.rows.length === 0) {
      await db.execute({
        sql: "INSERT INTO boards (id, data, owner_id, updated_at) VALUES (?, ?, ?, datetime('now'))",
        args: [board.id, JSON.stringify({ ...board, version: 1, labelNames: board.labelNames || {} }), null],
      });
    }
  }

  demoSeeded = true;
}
