import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs", () => {
  return {
    default: {
      existsSync: vi.fn(),
      mkdirSync: vi.fn(),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      unlinkSync: vi.fn(),
    },
  };
});

vi.mock("@/lib/event-bus", () => ({
  broadcast: vi.fn(),
}));

import fs from "fs";
import { GET, PUT, DELETE } from "./route";
import { broadcast } from "@/lib/event-bus";

const mockFs = vi.mocked(fs);
const mockBroadcast = vi.mocked(broadcast);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFs.existsSync.mockReturnValue(true);
});

describe("GET /api/board/[id]", () => {
  it("returns board data when file exists", async () => {
    const boardData = { id: "board-1", name: "Test", lists: [], cards: {}, version: 3 };
    mockFs.readFileSync.mockReturnValue(JSON.stringify(boardData));

    const response = await GET(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    const data = await response.json();
    expect(data).toEqual(boardData);
    expect(response.status).toBe(200);
  });

  it("returns 404 when file does not exist", async () => {
    mockFs.existsSync.mockReturnValue(false);

    const response = await GET(new Request("http://localhost/api/board/board-999"), makeParams("board-999"));
    expect(response.status).toBe(404);
  });

  it("backfills version:0 for old boards without version field", async () => {
    const oldBoard = { id: "board-old", name: "Old", lists: [], cards: {} };
    mockFs.readFileSync.mockReturnValue(JSON.stringify(oldBoard));

    const response = await GET(new Request("http://localhost/api/board/board-old"), makeParams("board-old"));
    const data = await response.json();
    expect(data.version).toBe(0);
  });
});

describe("PUT /api/board/[id]", () => {
  it("writes JSON file with incremented version", async () => {
    const diskData = { id: "board-1", name: "Old", lists: [], cards: {}, version: 2 };
    mockFs.readFileSync.mockReturnValue(JSON.stringify(diskData));

    const boardData = { id: "board-1", name: "Updated", lists: [], cards: {}, version: 2 };
    const request = new Request("http://localhost/api/board/board-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Client-Id": "client-abc" },
      body: JSON.stringify(boardData),
    });

    const response = await PUT(request, makeParams("board-1"));
    const data = await response.json();
    expect(data).toEqual({ ok: true, version: 3 });
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("board-1.json"),
      expect.stringContaining('"version": 3'),
      "utf-8",
    );
  });

  it("returns 409 on version conflict", async () => {
    const diskData = { id: "board-1", name: "Server", lists: [], cards: {}, version: 5 };
    mockFs.readFileSync.mockReturnValue(JSON.stringify(diskData));

    const staleBoard = { id: "board-1", name: "Stale", lists: [], cards: {}, version: 3 };
    const request = new Request("http://localhost/api/board/board-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(staleBoard),
    });

    const response = await PUT(request, makeParams("board-1"));
    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.conflict).toBe(true);
    expect(data.serverBoard.version).toBe(5);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("broadcasts to other clients on successful save", async () => {
    const diskData = { id: "board-1", name: "Old", lists: [], cards: {}, version: 1 };
    mockFs.readFileSync.mockReturnValue(JSON.stringify(diskData));

    const boardData = { id: "board-1", name: "New", lists: [], cards: {}, version: 1 };
    const request = new Request("http://localhost/api/board/board-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Client-Id": "client-xyz" },
      body: JSON.stringify(boardData),
    });

    await PUT(request, makeParams("board-1"));
    expect(mockBroadcast).toHaveBeenCalledWith(
      "board-1",
      "client-xyz",
      "board-updated",
      expect.objectContaining({ version: 2 }),
    );
  });

  it("handles boards without version field (backward compat)", async () => {
    const oldDiskData = { id: "board-1", name: "Old", lists: [], cards: {} };
    mockFs.readFileSync.mockReturnValue(JSON.stringify(oldDiskData));

    const boardData = { id: "board-1", name: "Updated", lists: [], cards: {} };
    const request = new Request("http://localhost/api/board/board-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(boardData),
    });

    const response = await PUT(request, makeParams("board-1"));
    const data = await response.json();
    expect(data).toEqual({ ok: true, version: 1 });
  });

  it("allows save when file does not exist yet", async () => {
    mockFs.existsSync.mockImplementation((p) => {
      // ensureDir check returns true, but board file doesn't exist
      return typeof p === "string" && !p.endsWith(".json");
    });

    const boardData = { id: "board-new", name: "New", lists: [], cards: {}, version: 0 };
    const request = new Request("http://localhost/api/board/board-new", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(boardData),
    });

    const response = await PUT(request, makeParams("board-new"));
    const data = await response.json();
    expect(data).toEqual({ ok: true, version: 1 });
    expect(mockFs.writeFileSync).toHaveBeenCalled();
  });
});

describe("DELETE /api/board/[id]", () => {
  it("removes the file when it exists", async () => {
    mockFs.existsSync.mockReturnValue(true);

    const response = await DELETE(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    const data = await response.json();
    expect(data).toEqual({ ok: true });
    expect(mockFs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining("board-1.json"));
  });

  it("returns ok even when file does not exist", async () => {
    mockFs.existsSync.mockReturnValue(false);

    const response = await DELETE(new Request("http://localhost/api/board/board-999"), makeParams("board-999"));
    const data = await response.json();
    expect(data).toEqual({ ok: true });
    expect(mockFs.unlinkSync).not.toHaveBeenCalled();
  });

  it("broadcasts board-deleted event", async () => {
    mockFs.existsSync.mockReturnValue(true);

    await DELETE(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    expect(mockBroadcast).toHaveBeenCalledWith("board-1", "", "board-deleted", { boardId: "board-1" });
  });
});
