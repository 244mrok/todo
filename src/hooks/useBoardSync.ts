"use client";

import { useEffect, useRef, useState } from "react";
import type { BoardData } from "@/types/board";

interface UseBoardSyncOptions {
  boardId: string;
  onRemoteUpdate: (board: BoardData) => void;
  onDeleted: () => void;
}

export function useBoardSync({ boardId, onRemoteUpdate, onDeleted }: UseBoardSyncOptions) {
  const [clientId] = useState(() => `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryDelay = useRef(1000);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!boardId) return;

    function connect() {
      // Clean up existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const es = new EventSource(`/api/board/${boardId}/events?clientId=${clientId}`);
      eventSourceRef.current = es;

      es.addEventListener("connected", () => {
        retryDelay.current = 1000; // Reset backoff on successful connection
      });

      es.addEventListener("board-updated", (e) => {
        try {
          const board: BoardData = JSON.parse(e.data);
          onRemoteUpdate(board);
        } catch {
          // Ignore malformed data
        }
      });

      es.addEventListener("board-deleted", () => {
        onDeleted();
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;

        // Exponential backoff reconnection: 1s, 2s, 4s, ... max 30s
        const delay = retryDelay.current;
        retryDelay.current = Math.min(delay * 2, 30_000);

        retryTimer.current = setTimeout(() => {
          // Refetch latest board state on reconnect to catch missed updates
          fetch(`/api/board/${boardId}`)
            .then(res => { if (res.ok) return res.json(); })
            .then(data => { if (data) onRemoteUpdate(data); })
            .catch(() => {});
          connect();
        }, delay);
      };
    }

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
    };
  }, [boardId, clientId, onRemoteUpdate, onDeleted]);

  return { clientId };
}
