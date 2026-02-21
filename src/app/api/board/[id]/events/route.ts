import { subscribe } from "@/lib/event-bus";
import { getSession } from "@/lib/session";
import { isBoardOwner } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const BOARDS_DIR = path.join(process.cwd(), "data", "boards");

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return new Response("Not authenticated", { status: 401 });
  }

  const { id: boardId } = await params;

  // Allow if board doesn't exist on disk yet (new unsaved board)
  const boardExists = fs.existsSync(path.join(BOARDS_DIR, `${boardId}.json`));
  if (boardExists && !isBoardOwner(boardId, session.userId)) {
    return new Response("Access denied", { status: 403 });
  }

  const url = new URL(req.url);
  const clientId = url.searchParams.get("clientId") ?? "anonymous";

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let pingInterval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connected event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ clientId, boardId })}\n\n`),
      );

      // Subscribe to board updates
      unsubscribe = subscribe(boardId, clientId, controller);

      // 30s keepalive pings
      pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // Stream closed
          if (pingInterval) clearInterval(pingInterval);
          if (unsubscribe) unsubscribe();
        }
      }, 30_000);
    },
    cancel() {
      if (pingInterval) clearInterval(pingInterval);
      if (unsubscribe) unsubscribe();
    },
  });

  // Clean up when client disconnects
  req.signal.addEventListener("abort", () => {
    if (pingInterval) clearInterval(pingInterval);
    if (unsubscribe) unsubscribe();
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
