/**
 * Seed demo data for the Todo Board app.
 * Usage: npx tsx scripts/seed-demo.ts
 *
 * Creates sample boards in data/boards/ to showcase the app's features:
 *  - Product Launch board (planning workflow)
 *  - Sales Pipeline board (CRM-style pipeline)
 *  - Sales Pipeline JP board (Japanese localization demo)
 */
import fs from "fs";
import path from "path";
import { DEMO_BOARDS } from "../src/lib/demo-boards";

const BOARDS_DIR = path.join(process.cwd(), "data", "boards");

function ensureDir() {
  if (!fs.existsSync(BOARDS_DIR)) {
    fs.mkdirSync(BOARDS_DIR, { recursive: true });
  }
}

console.log("Seeding demo boards...\n");
ensureDir();

let totalCards = 0;
for (const board of DEMO_BOARDS) {
  const filePath = path.join(BOARDS_DIR, `${board.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(board, null, 2), "utf-8");
  console.log(`  Created ${filePath}`);
  totalCards += Object.keys(board.cards).length;
}

console.log("\nDone! Created %d demo boards with %d total cards.", DEMO_BOARDS.length, totalCards);
