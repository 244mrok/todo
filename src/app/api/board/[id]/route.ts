import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const BOARDS_DIR = path.join(process.cwd(), "data", "boards");

function ensureDir() {
  if (!fs.existsSync(BOARDS_DIR)) {
    fs.mkdirSync(BOARDS_DIR, { recursive: true });
  }
}

// GET /api/board/[id] — load a specific board
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  ensureDir();
  const { id } = await params;
  const filePath = path.join(BOARDS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json(null, { status: 404 });
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return NextResponse.json(JSON.parse(raw));
}

// PUT /api/board/[id] — save a specific board
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  ensureDir();
  const { id } = await params;
  const body = await req.json();
  fs.writeFileSync(path.join(BOARDS_DIR, `${id}.json`), JSON.stringify(body, null, 2), "utf-8");
  return NextResponse.json({ ok: true });
}

// DELETE /api/board/[id] — delete a board
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  ensureDir();
  const { id } = await params;
  const filePath = path.join(BOARDS_DIR, `${id}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  return NextResponse.json({ ok: true });
}
