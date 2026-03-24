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
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  const onDeletedRef = useRef(onDeleted);

  // Keep refs in sync to avoid re-triggering useEffect
  onRemoteUpdateRef.current = onRemoteUpdate;
  onDeletedRef.current = onDeleted;

  useEffect(() => {
    if (!boardId) return;

    let sseConnected = false;

    function connect() {
      // Clean up existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      const es = new EventSource(`/api/board/${boardId}/events?clientId=${clientId}`);
      eventSourceRef.current = es;

      es.addEventListener("connected", () => {
        retryDelay.current = 1000;
        sseConnected = true;
      });

      es.addEventListener("board-updated", (e) => {
        try {
          const board: BoardData = JSON.parse(e.data);
          onRemoteUpdateRef.current(board);
        } catch {
          // Ignore malformed data
        }
      });

      es.addEventListener("board-deleted", () => {
        onDeletedRef.current();
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        sseConnected = false;

        const delay = retryDelay.current;
        retryDelay.current = Math.min(delay * 2, 30_000);

        retryTimer.current = setTimeout(() => {
          fetch(`/api/board/${boardId}`)
            .then(res => { if (res.ok) return res.json(); })
            .then(data => { if (data) onRemoteUpdateRef.current(data); })
            .catch(() => {});
          connect();
        }, delay);
      };
    }

    connect();

    // Polling fallback: on serverless platforms (Vercel), SSE broadcast
    // only works within the same instance. Poll every 5s to catch updates
    // from other instances that SSE missed.
    pollTimer.current = setInterval(() => {
      fetch(`/api/board/${boardId}`)
        .then(res => { if (res.ok) return res.json(); })
        .then(data => { if (data) onRemoteUpdateRef.current(data); })
        .catch(() => {});
    }, 5000);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimer.current) {
        clearTimeout(retryTimer.current);
        retryTimer.current = null;
      }
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [boardId, clientId]);

  return { clientId };
}
