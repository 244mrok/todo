import fs from "fs";
import path from "path";
import { BOARDS_DIR } from "./db";
import type { BoardData } from "@/types/board";

export interface BoardAccessResult {
  authorized: boolean;
  isOwner: boolean;
  board: BoardData | null;
}

/**
 * Check if a user has access to a board.
 * Public boards (ownerId === null) are accessible to all.
 * Private boards require the user to be the owner or an editor.
 */
export function checkBoardAccess(boardId: string, userId: string): BoardAccessResult {
  const filePath = path.join(BOARDS_DIR, `${boardId}.json`);
  if (!fs.existsSync(filePath)) {
    return { authorized: false, isOwner: false, board: null };
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const board: BoardData = JSON.parse(raw);

  // Backfill auth fields for legacy boards
  if (board.ownerId === undefined) board.ownerId = null;
  if (!board.editors) board.editors = [];

  // Public board — accessible to all
  if (board.ownerId === null) {
    return { authorized: true, isOwner: false, board };
  }

  const isOwner = board.ownerId === userId;
  const isEditor = board.editors.includes(userId);

  return {
    authorized: isOwner || isEditor,
    isOwner,
    board,
  };
}

/** Only the board owner can manage sharing */
export function canManageSharing(board: BoardData, userId: string): boolean {
  return board.ownerId !== null && board.ownerId === userId;
}

/** Owner can delete their own board; public boards (ownerId === null) can be deleted by anyone */
export function canDeleteBoard(board: BoardData, userId: string): boolean {
  if (board.ownerId === null) return true;
  return board.ownerId === userId;
}
