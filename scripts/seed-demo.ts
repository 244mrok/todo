/**
 * Seed demo data for the Todo Board app.
 * Usage: npx tsx scripts/seed-demo.ts
 *
 * Creates sample boards in the database to showcase the app's features:
 *  - Product Launch board (planning workflow)
 *  - Sales Pipeline board (CRM-style pipeline)
 *  - Sales Pipeline JP board (Japanese localization demo)
 */
import { seedDemoBoards } from "../src/lib/board-repo";

async function main() {
  console.log("Seeding demo boards...\n");
  await seedDemoBoards();
  console.log("Done! Demo boards seeded.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
