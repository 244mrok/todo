import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { broadcast } from "@/lib/event-bus";
import { getSession } from "@/lib/session";
import { BOARDS_DIR } from "@/lib/db";
import { checkBoardAccess, canDeleteBoard } from "@/lib/board-auth";

function ensureDir() {
  if (!fs.existsSync(BOARDS_DIR)) {
    fs.mkdirSync(BOARDS_DIR, { recursive: true });
  }
}

// GET /api/board/[id] — load a specific board
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  ensureDir();
  const { id } = await params;
  const filePath = path.join(BOARDS_DIR, `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(null, { status: 404 });
  }

  const { authorized, board } = checkBoardAccess(id, session.userId);
  if (!authorized || !board) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  // Backfill version for old boards
  if (board.version === undefined) {
    (board as unknown as Record<string, unknown>).version = 0;
  }
  // Backfill auth fields for legacy boards
  if (board.ownerId === undefined) board.ownerId = null;
  if (!board.editors) board.editors = [];

  return NextResponse.json(board);
}

// PUT /api/board/[id] — save a specific board
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  ensureDir();
  const { id } = await params;
  const body = await req.json();
  const clientId = req.headers.get("X-Client-Id") || "";
  const filePath = path.join(BOARDS_DIR, `${id}.json`);

  const isNew = !fs.existsSync(filePath);

  // Read current version and auth fields from disk
  let diskVersion = 0;
  let diskOwnerId: string | null = null;
  let diskEditors: string[] = [];

  if (!isNew) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const diskData = JSON.parse(raw);
      diskVersion = diskData.version ?? 0;
      diskOwnerId = diskData.ownerId ?? null;
      diskEditors = diskData.editors ?? [];
    } catch {
      // File corrupt or unreadable — allow overwrite
    }

    // Access check for existing boards
    const { authorized } = checkBoardAccess(id, session.userId);
    if (!authorized) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
  }

  const incomingVersion = body.version ?? 0;

  // Conflict: client version is behind disk version
  if (incomingVersion < diskVersion) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const serverBoard = JSON.parse(raw);
    if (serverBoard.version === undefined) serverBoard.version = 0;
    return NextResponse.json({ conflict: true, serverBoard }, { status: 409 });
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

  fs.writeFileSync(filePath, JSON.stringify(boardToSave, null, 2), "utf-8");

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

  ensureDir();
  const { id } = await params;

  const filePath = path.join(BOARDS_DIR, `${id}.json`);
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const board = JSON.parse(raw);
    // Backfill auth fields
    if (board.ownerId === undefined) board.ownerId = null;
    if (!board.editors) board.editors = [];

    if (!canDeleteBoard(board, session.userId)) {
      return NextResponse.json({ error: "Only the board owner can delete this board." }, { status: 403 });
    }

    fs.unlinkSync(filePath);
  }
  // Notify connected clients
  broadcast(id, "", "board-deleted", { boardId: id });
  return NextResponse.json({ ok: true });
}
