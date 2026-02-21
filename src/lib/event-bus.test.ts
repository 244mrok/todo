import { describe, it, expect } from "vitest";
import { subscribe, broadcast, getSubscriberCount } from "./event-bus";

// Helper to create a mock ReadableStreamDefaultController
function mockController() {
  const chunks: Uint8Array[] = [];
  return {
    enqueue: (chunk: Uint8Array) => { chunks.push(chunk); },
    close: () => {},
    error: () => {},
    desiredSize: 1,
    chunks,
  } as unknown as ReadableStreamDefaultController & { chunks: Uint8Array[] };
}

// Reset module state between tests by re-importing
// Since the event bus uses module-level state, we test it directly

describe("event-bus", () => {
  // We'll use unique board IDs per test to avoid cross-test pollution

  describe("subscribe", () => {
    it("registers a subscriber and returns an unsubscribe function", () => {
      const boardId = "test-sub-" + Date.now();
      const ctrl = mockController();
      const unsub = subscribe(boardId, "client-1", ctrl);

      expect(getSubscriberCount(boardId)).toBe(1);

      unsub();
      expect(getSubscriberCount(boardId)).toBe(0);
    });

    it("supports multiple subscribers on the same board", () => {
      const boardId = "test-multi-" + Date.now();
      const ctrl1 = mockController();
      const ctrl2 = mockController();
      const unsub1 = subscribe(boardId, "client-1", ctrl1);
      const unsub2 = subscribe(boardId, "client-2", ctrl2);

      expect(getSubscriberCount(boardId)).toBe(2);

      unsub1();
      expect(getSubscriberCount(boardId)).toBe(1);

      unsub2();
      expect(getSubscriberCount(boardId)).toBe(0);
    });
  });

  describe("broadcast", () => {
    it("sends data to all subscribers except sender", () => {
      const boardId = "test-bcast-" + Date.now();
      const ctrl1 = mockController();
      const ctrl2 = mockController();
      const ctrl3 = mockController();
      const unsub1 = subscribe(boardId, "client-1", ctrl1);
      const unsub2 = subscribe(boardId, "client-2", ctrl2);
      const unsub3 = subscribe(boardId, "client-3", ctrl3);

      broadcast(boardId, "client-1", "board-updated", { id: boardId });

      // client-1 (sender) should not receive
      expect(ctrl1.chunks.length).toBe(0);
      // client-2 and client-3 should receive
      expect(ctrl2.chunks.length).toBe(1);
      expect(ctrl3.chunks.length).toBe(1);

      const decoded = new TextDecoder().decode(ctrl2.chunks[0]);
      expect(decoded).toContain("event: board-updated");
      expect(decoded).toContain(boardId);

      unsub1();
      unsub2();
      unsub3();
    });

    it("does nothing for a board with no subscribers", () => {
      // Should not throw
      broadcast("nonexistent-board", "client-1", "board-updated", {});
    });

    it("cleans up subscribers that throw on enqueue", () => {
      const boardId = "test-cleanup-" + Date.now();
      const brokenCtrl = {
        enqueue: () => { throw new Error("closed"); },
        close: () => {},
        error: () => {},
        desiredSize: 1,
      } as unknown as ReadableStreamDefaultController;
      const goodCtrl = mockController();

      subscribe(boardId, "broken", brokenCtrl);
      const unsub = subscribe(boardId, "good", goodCtrl);

      broadcast(boardId, "sender", "board-updated", { test: true });

      // Broken client should have been cleaned up
      expect(getSubscriberCount(boardId)).toBe(1);
      expect(goodCtrl.chunks.length).toBe(1);

      unsub();
    });
  });

  describe("getSubscriberCount", () => {
    it("returns 0 for unknown board", () => {
      expect(getSubscriberCount("no-such-board")).toBe(0);
    });
  });
});
