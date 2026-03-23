import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listBoardsForUser, seedDemoBoards } from "@/lib/board-repo";

// GET /api/board — list boards accessible to the current user
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  await seedDemoBoards();
  const boards = await listBoardsForUser(session.userId);

  return NextResponse.json(boards);
}
