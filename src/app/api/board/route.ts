import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/session";
import { getUserBoards } from "@/lib/auth";
import { BOARDS_DIR } from "@/lib/db";

function ensureDir() {
  if (!fs.existsSync(BOARDS_DIR)) {
    fs.mkdirSync(BOARDS_DIR, { recursive: true });
  }
}

// GET /api/board — list boards owned by the current user
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  ensureDir();
  const ownedBoardIds = new Set(await getUserBoards(session.userId));
  const files = fs.readdirSync(BOARDS_DIR).filter(f => f.endsWith(".json"));
  const boards = files
    .filter(f => ownedBoardIds.has(f.replace(".json", "")))
    .map(f => {
      const raw = fs.readFileSync(path.join(BOARDS_DIR, f), "utf-8");
      const data = JSON.parse(raw);
      return { id: data.id, name: data.name || "Untitled" };
    });
  return NextResponse.json(boards);
}
