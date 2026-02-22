import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/session";
import { BOARDS_DIR } from "@/lib/db";
import { seedDemoBoards } from "@/lib/demo-boards";

// GET /api/board — list boards accessible to the current user
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  seedDemoBoards();
  const files = fs.readdirSync(BOARDS_DIR).filter(f => f.endsWith(".json"));
  const boards: { id: string; name: string; ownerId: string | null; isOwner: boolean }[] = [];

  for (const f of files) {
    const raw = fs.readFileSync(path.join(BOARDS_DIR, f), "utf-8");
    const data = JSON.parse(raw);
    const ownerId: string | null = data.ownerId ?? null;
    const editors: string[] = data.editors ?? [];

    // Filter: public boards, boards owned by user, or boards where user is editor
    if (ownerId === null || ownerId === session.userId || editors.includes(session.userId)) {
      boards.push({
        id: data.id,
        name: data.name || "Untitled",
        ownerId,
        isOwner: ownerId === session.userId,
      });
    }
  }

  return NextResponse.json(boards);
}
