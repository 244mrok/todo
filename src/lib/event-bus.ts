type Subscriber = {
  clientId: string;
  controller: ReadableStreamDefaultController;
};

const boards = new Map<string, Map<string, Subscriber>>();

export function subscribe(
  boardId: string,
  clientId: string,
  controller: ReadableStreamDefaultController,
): () => void {
  if (!boards.has(boardId)) {
    boards.set(boardId, new Map());
  }
  const subs = boards.get(boardId)!;
  subs.set(clientId, { clientId, controller });

  return () => {
    subs.delete(clientId);
    if (subs.size === 0) {
      boards.delete(boardId);
    }
  };
}

export function broadcast(boardId: string, senderClientId: string, event: string, data: unknown): void {
  const subs = boards.get(boardId);
  if (!subs) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = new TextEncoder().encode(payload);

  for (const [id, sub] of subs) {
    if (id === senderClientId) continue;
    try {
      sub.controller.enqueue(encoded);
    } catch {
      // Client disconnected — clean up
      subs.delete(id);
    }
  }

  if (subs.size === 0) {
    boards.delete(boardId);
  }
}

export function getSubscriberCount(boardId: string): number {
  return boards.get(boardId)?.size ?? 0;
}
