import { NextResponse } from "next/server";
import { broadcast } from "@/lib/event-bus";
import { getSession } from "@/lib/session";
import { checkBoardAccess, canDeleteBoard } from "@/lib/board-auth";
import { getBoard, saveBoard, deleteBoard } from "@/lib/board-repo";

// GET /api/board/[id] — load a specific board
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;

  const { authorized, board } = await checkBoardAccess(id, session.userId);
  if (!authorized || !board) {
    // Distinguish 404 from 403
    const exists = await getBoard(id);
    if (!exists) {
      return NextResponse.json(null, { status: 404 });
    }
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  // Backfill version for old boards
  if (board.version === undefined) {
    (board as unknown as Record<string, unknown>).version = 0;
  }

  return NextResponse.json(board);
}

// PUT /api/board/[id] — save a specific board
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const clientId = req.headers.get("X-Client-Id") || "";

  const existingBoard = await getBoard(id);
  const isNew = !existingBoard;

  let diskVersion = 0;
  let diskOwnerId: string | null = null;
  let diskEditors: string[] = [];

  if (!isNew) {
    diskVersion = existingBoard.version ?? 0;
    diskOwnerId = existingBoard.ownerId ?? null;
    diskEditors = existingBoard.editors ?? [];

    // Access check for existing boards
    const { authorized } = await checkBoardAccess(id, session.userId);
    if (!authorized) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
  }

  const incomingVersion = body.version ?? 0;

  // Conflict: client version is behind disk version
  if (incomingVersion < diskVersion) {
    return NextResponse.json({ conflict: true, serverBoard: existingBoard }, { status: 409 });
  }

  // Write with incremented version
  const newVersion = diskVersion + 1;

  // Strip ownerId/editors from client body — always use server-side values
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ownerId: _ownerId, editors: _editors, ...safeBody } = body;

  const boardToSave = {
    ...safeBody,
    version: newVersion,
    ownerId: isNew ? session.userId : diskOwnerId,
    editors: isNew ? [] : diskEditors,
  };

  await saveBoard(boardToSave);

  // Broadcast to other connected clients
  broadcast(id, clientId, "board-updated", boardToSave);

  return NextResponse.json({ ok: true, version: newVersion });
}

// DELETE /api/board/[id] — delete a board
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;

  const board = await getBoard(id);
  if (board) {
    if (!canDeleteBoard(board, session.userId)) {
      return NextResponse.json({ error: "Only the board owner can delete this board." }, { status: 403 });
    }

    await deleteBoard(id);
  }

  // Notify connected clients
  broadcast(id, "", "board-deleted", { boardId: id });
  return NextResponse.json({ ok: true });
}
