import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { broadcast } from "@/lib/event-bus";
import { getSession } from "@/lib/session";
import { BOARDS_DIR } from "@/lib/db";

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
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);
  // Backfill version for old boards
  if (data.version === undefined) {
    data.version = 0;
  }
  return NextResponse.json(data);
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

  // Read current version from disk
  let diskVersion = 0;
  if (!isNew) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const diskData = JSON.parse(raw);
      diskVersion = diskData.version ?? 0;
    } catch {
      // File corrupt or unreadable — allow overwrite
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
  const boardToSave = { ...body, version: newVersion };
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
    fs.unlinkSync(filePath);
  }
  // Notify connected clients
  broadcast(id, "", "board-deleted", { boardId: id });
  return NextResponse.json({ ok: true });
}
