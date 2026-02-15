import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const BOARDS_DIR = path.join(process.cwd(), "data", "boards");

function ensureDir() {
  if (!fs.existsSync(BOARDS_DIR)) {
    fs.mkdirSync(BOARDS_DIR, { recursive: true });
  }
}

// GET /api/board — list all saved boards [{id, name}]
export async function GET() {
  ensureDir();
  const files = fs.readdirSync(BOARDS_DIR).filter(f => f.endsWith(".json"));
  const boards = files.map(f => {
    const raw = fs.readFileSync(path.join(BOARDS_DIR, f), "utf-8");
    const data = JSON.parse(raw);
    return { id: data.id, name: data.name || "Untitled" };
  });
  return NextResponse.json(boards);
}
