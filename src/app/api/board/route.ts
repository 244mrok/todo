import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/session";
import { BOARDS_DIR } from "@/lib/db";
import { seedDemoBoards } from "@/lib/demo-boards";

// GET /api/board — list all boards for any authenticated user
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  seedDemoBoards();
  const files = fs.readdirSync(BOARDS_DIR).filter(f => f.endsWith(".json"));
  const boards = files.map(f => {
    const raw = fs.readFileSync(path.join(BOARDS_DIR, f), "utf-8");
    const data = JSON.parse(raw);
    return { id: data.id, name: data.name || "Untitled" };
  });
  return NextResponse.json(boards);
}
