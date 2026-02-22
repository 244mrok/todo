import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/session";
import { BOARDS_DIR } from "@/lib/db";
import { checkBoardAccess, canManageSharing } from "@/lib/board-auth";
import { getUserByEmail, getUserById } from "@/lib/auth";

function ensureDir() {
  if (!fs.existsSync(BOARDS_DIR)) {
    fs.mkdirSync(BOARDS_DIR, { recursive: true });
  }
}

// GET /api/board/[id]/sharing — get sharing info (owner only)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  ensureDir();
  const { id } = await params;

  const { authorized, board } = checkBoardAccess(id, session.userId);
  if (!authorized || !board) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  if (!canManageSharing(board, session.userId)) {
    return NextResponse.json({ error: "Only the board owner can manage sharing." }, { status: 403 });
  }

  // Resolve editor user info
  const editors: { id: string; email: string; name: string }[] = [];
  for (const editorId of board.editors) {
    const user = await getUserById(editorId);
    if (user) {
      editors.push({ id: user.id, email: user.email, name: user.name });
    }
  }

  return NextResponse.json({
    ownerId: board.ownerId,
    editors,
  });
}

// PUT /api/board/[id]/sharing — add/remove editor (owner only)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  ensureDir();
  const { id } = await params;
  const body = await req.json();
  const { action, email } = body as { action: string; email: string };

  if (!action || !email) {
    return NextResponse.json({ error: "Missing action or email." }, { status: 400 });
  }

  const filePath = path.join(BOARDS_DIR, `${id}.json`);
  const { authorized, board } = checkBoardAccess(id, session.userId);
  if (!authorized || !board) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  if (!canManageSharing(board, session.userId)) {
    return NextResponse.json({ error: "Only the board owner can manage sharing." }, { status: 403 });
  }

  // Look up user by email
  const targetUser = await getUserByEmail(email);
  if (!targetUser) {
    return NextResponse.json({ error: "No user found with that email address." }, { status: 404 });
  }

  if (action === "add") {
    // Cannot add self
    if (targetUser.id === session.userId) {
      return NextResponse.json({ error: "You are already the owner of this board." }, { status: 400 });
    }
    // Already an editor?
    if (board.editors.includes(targetUser.id)) {
      return NextResponse.json({ error: "This user is already an editor." }, { status: 400 });
    }
    board.editors.push(targetUser.id);
  } else if (action === "remove") {
    board.editors = board.editors.filter(eid => eid !== targetUser.id);
  } else {
    return NextResponse.json({ error: "Invalid action. Use 'add' or 'remove'." }, { status: 400 });
  }

  // Write updated board
  fs.writeFileSync(filePath, JSON.stringify(board, null, 2), "utf-8");

  // Resolve updated editor list
  const editors: { id: string; email: string; name: string }[] = [];
  for (const editorId of board.editors) {
    const user = await getUserById(editorId);
    if (user) {
      editors.push({ id: user.id, email: user.email, name: user.name });
    }
  }

  return NextResponse.json({ ownerId: board.ownerId, editors });
}
