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

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/board-auth", () => ({
  checkBoardAccess: vi.fn(),
  canDeleteBoard: vi.fn(),
}));

import fs from "fs";
import { GET, PUT, DELETE } from "./route";
import { broadcast } from "@/lib/event-bus";
import { getSession } from "@/lib/session";
import { checkBoardAccess, canDeleteBoard } from "@/lib/board-auth";

const mockFs = vi.mocked(fs);
const mockBroadcast = vi.mocked(broadcast);
const mockGetSession = vi.mocked(getSession);
const mockCheckBoardAccess = vi.mocked(checkBoardAccess);
const mockCanDeleteBoard = vi.mocked(canDeleteBoard);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const OWNER_SESSION = { userId: "user-1", email: "owner@test.com" };
const EDITOR_SESSION = { userId: "user-2", email: "editor@test.com" };
const STRANGER_SESSION = { userId: "user-3", email: "stranger@test.com" };

function makeBoardJson(overrides = {}) {
  return JSON.stringify({
    id: "board-1",
    name: "Test Board",
    lists: [],
    cards: {},
    labelNames: {},
    version: 1,
    ownerId: "user-1",
    editors: ["user-2"],
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFs.existsSync.mockReturnValue(true);
  mockGetSession.mockResolvedValue(OWNER_SESSION);
  mockCheckBoardAccess.mockReturnValue({
    authorized: true,
    isOwner: true,
    board: { id: "board-1", name: "Test", lists: [], cards: {}, version: 1, labelNames: {}, ownerId: "user-1", editors: ["user-2"] },
  });
  mockCanDeleteBoard.mockReturnValue(true);
});

// ─────────────────────────────────────────────
// CREATE (PUT new board)
// ─────────────────────────────────────────────
describe("CREATE — PUT /api/board/[id] (new board)", () => {
  beforeEach(() => {
    // Board file does not exist yet
    mockFs.existsSync.mockImplementation((p) => {
      return typeof p === "string" && !p.endsWith(".json");
    });
  });

  it("creates a new board with ownerId set to current user", async () => {
    const boardData = { id: "board-new", name: "My Project", lists: [], cards: {}, version: 0 };
    const request = new Request("http://localhost/api/board/board-new", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(boardData),
    });

    const response = await PUT(request, makeParams("board-new"));
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toEqual({ ok: true, version: 1 });

    const writtenData = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
    expect(writtenData.ownerId).toBe("user-1");
    expect(writtenData.editors).toEqual([]);
    expect(writtenData.name).toBe("My Project");
    expect(writtenData.version).toBe(1);
  });

  it("ignores ownerId/editors sent by client on creation", async () => {
    const boardData = { id: "board-new", name: "Hack", lists: [], cards: {}, version: 0, ownerId: "attacker", editors: ["attacker"] };
    const request = new Request("http://localhost/api/board/board-new", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(boardData),
    });

    await PUT(request, makeParams("board-new"));
    const writtenData = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
    expect(writtenData.ownerId).toBe("user-1"); // Current session user, not "attacker"
    expect(writtenData.editors).toEqual([]);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const request = new Request("http://localhost/api/board/board-new", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "board-new", name: "Test", lists: [], cards: {}, version: 0 }),
    });

    const response = await PUT(request, makeParams("board-new"));
    expect(response.status).toBe(401);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("broadcasts board-updated after creation", async () => {
    const boardData = { id: "board-new", name: "New", lists: [], cards: {}, version: 0 };
    const request = new Request("http://localhost/api/board/board-new", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Client-Id": "client-1" },
      body: JSON.stringify(boardData),
    });

    await PUT(request, makeParams("board-new"));
    expect(mockBroadcast).toHaveBeenCalledWith(
      "board-new", "client-1", "board-updated",
      expect.objectContaining({ version: 1, ownerId: "user-1" }),
    );
  });
});

// ─────────────────────────────────────────────
// READ (GET board)
// ─────────────────────────────────────────────
describe("READ — GET /api/board/[id]", () => {
  it("returns board data for owner", async () => {
    const boardData = { id: "board-1", name: "Test", lists: [], cards: {}, version: 3, ownerId: "user-1", editors: [] };
    mockCheckBoardAccess.mockReturnValue({ authorized: true, isOwner: true, board: boardData as never });

    const response = await GET(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.id).toBe("board-1");
    expect(data.name).toBe("Test");
  });

  it("returns board data for editor", async () => {
    mockGetSession.mockResolvedValue(EDITOR_SESSION);
    const boardData = { id: "board-1", name: "Test", lists: [], cards: {}, version: 3, ownerId: "user-1", editors: ["user-2"] };
    mockCheckBoardAccess.mockReturnValue({ authorized: true, isOwner: false, board: boardData as never });

    const response = await GET(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    expect(response.status).toBe(200);
  });

  it("returns board data for public board (ownerId null)", async () => {
    mockGetSession.mockResolvedValue(STRANGER_SESSION);
    const boardData = { id: "demo-1", name: "Demo", lists: [], cards: {}, version: 1, ownerId: null, editors: [] };
    mockCheckBoardAccess.mockReturnValue({ authorized: true, isOwner: false, board: boardData as never });

    const response = await GET(new Request("http://localhost/api/board/demo-1"), makeParams("demo-1"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ownerId).toBeNull();
  });

  it("returns 403 for stranger on private board", async () => {
    mockGetSession.mockResolvedValue(STRANGER_SESSION);
    mockCheckBoardAccess.mockReturnValue({ authorized: false, isOwner: false, board: null });

    const response = await GET(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    expect(response.status).toBe(403);
  });

  it("returns 404 when board file does not exist", async () => {
    mockFs.existsSync.mockReturnValue(false);

    const response = await GET(new Request("http://localhost/api/board/nonexistent"), makeParams("nonexistent"));
    expect(response.status).toBe(404);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    expect(response.status).toBe(401);
  });

  it("backfills version:0 for legacy boards", async () => {
    const oldBoard = { id: "old", name: "Old", lists: [], cards: {}, ownerId: null, editors: [] };
    mockCheckBoardAccess.mockReturnValue({ authorized: true, isOwner: false, board: oldBoard as never });

    const response = await GET(new Request("http://localhost/api/board/old"), makeParams("old"));
    const data = await response.json();
    expect(data.version).toBe(0);
  });
});

// ─────────────────────────────────────────────
// UPDATE (PUT existing board)
// ─────────────────────────────────────────────
describe("UPDATE — PUT /api/board/[id] (existing board)", () => {
  it("saves with incremented version for owner", async () => {
    mockFs.readFileSync.mockReturnValue(makeBoardJson({ version: 2 }));

    const request = new Request("http://localhost/api/board/board-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Client-Id": "client-1" },
      body: JSON.stringify({ id: "board-1", name: "Updated Name", lists: [], cards: {}, version: 2 }),
    });

    const response = await PUT(request, makeParams("board-1"));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: true, version: 3 });

    const writtenData = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
    expect(writtenData.name).toBe("Updated Name");
    expect(writtenData.version).toBe(3);
  });

  it("saves for editor (non-owner with edit access)", async () => {
    mockGetSession.mockResolvedValue(EDITOR_SESSION);
    mockCheckBoardAccess.mockReturnValue({
      authorized: true, isOwner: false,
      board: { id: "board-1", name: "Test", lists: [], cards: {}, version: 1, labelNames: {}, ownerId: "user-1", editors: ["user-2"] },
    });
    mockFs.readFileSync.mockReturnValue(makeBoardJson({ version: 1 }));

    const request = new Request("http://localhost/api/board/board-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "board-1", name: "Editor Update", lists: [], cards: {}, version: 1 }),
    });

    const response = await PUT(request, makeParams("board-1"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ok).toBe(true);
  });

  it("returns 403 for stranger on private board", async () => {
    mockGetSession.mockResolvedValue(STRANGER_SESSION);
    mockCheckBoardAccess.mockReturnValue({ authorized: false, isOwner: false, board: null });
    mockFs.readFileSync.mockReturnValue(makeBoardJson());

    const request = new Request("http://localhost/api/board/board-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "board-1", name: "Hack", lists: [], cards: {}, version: 1 }),
    });

    const response = await PUT(request, makeParams("board-1"));
    expect(response.status).toBe(403);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("returns 409 on version conflict (client behind server)", async () => {
    mockFs.readFileSync.mockReturnValue(makeBoardJson({ version: 5 }));

    const request = new Request("http://localhost/api/board/board-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "board-1", name: "Stale", lists: [], cards: {}, version: 3 }),
    });

    const response = await PUT(request, makeParams("board-1"));
    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.conflict).toBe(true);
    expect(data.serverBoard.version).toBe(5);
    expect(mockFs.writeFileSync).not.toHaveBeenCalled();
  });

  it("preserves ownerId/editors from disk (tamper-proof)", async () => {
    mockFs.readFileSync.mockReturnValue(makeBoardJson({ ownerId: "user-1", editors: ["user-2"] }));

    const request = new Request("http://localhost/api/board/board-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "board-1", name: "Tamper", lists: [], cards: {}, version: 1, ownerId: "attacker", editors: ["attacker"] }),
    });

    await PUT(request, makeParams("board-1"));
    const writtenData = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
    expect(writtenData.ownerId).toBe("user-1");
    expect(writtenData.editors).toEqual(["user-2"]);
  });

  it("handles legacy board without version field", async () => {
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ id: "board-1", name: "Old", lists: [], cards: {} }));

    const request = new Request("http://localhost/api/board/board-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "board-1", name: "Updated", lists: [], cards: {} }),
    });

    const response = await PUT(request, makeParams("board-1"));
    const data = await response.json();
    expect(data).toEqual({ ok: true, version: 1 });
  });

  it("broadcasts update to other connected clients", async () => {
    mockFs.readFileSync.mockReturnValue(makeBoardJson({ version: 1 }));

    const request = new Request("http://localhost/api/board/board-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Client-Id": "client-xyz" },
      body: JSON.stringify({ id: "board-1", name: "Broadcast", lists: [], cards: {}, version: 1 }),
    });

    await PUT(request, makeParams("board-1"));
    expect(mockBroadcast).toHaveBeenCalledWith(
      "board-1", "client-xyz", "board-updated",
      expect.objectContaining({ version: 2, name: "Broadcast" }),
    );
  });
});

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────
describe("DELETE /api/board/[id]", () => {
  it("deletes board when owner requests it", async () => {
    mockFs.readFileSync.mockReturnValue(makeBoardJson({ ownerId: "user-1" }));
    mockCanDeleteBoard.mockReturnValue(true);

    const response = await DELETE(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ ok: true });
    expect(mockFs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining("board-1.json"));
  });

  it("deletes public board (ownerId null) by any user", async () => {
    mockGetSession.mockResolvedValue(STRANGER_SESSION);
    mockFs.readFileSync.mockReturnValue(makeBoardJson({ ownerId: null }));
    mockCanDeleteBoard.mockReturnValue(true);

    const response = await DELETE(new Request("http://localhost/api/board/demo-1"), makeParams("demo-1"));
    expect(response.status).toBe(200);
    expect(mockFs.unlinkSync).toHaveBeenCalled();
  });

  it("returns 403 when editor tries to delete (not owner)", async () => {
    mockGetSession.mockResolvedValue(EDITOR_SESSION);
    mockFs.readFileSync.mockReturnValue(makeBoardJson({ ownerId: "user-1" }));
    mockCanDeleteBoard.mockReturnValue(false);

    const response = await DELETE(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    expect(response.status).toBe(403);
    expect(mockFs.unlinkSync).not.toHaveBeenCalled();
    const data = await response.json();
    expect(data.error).toContain("owner");
  });

  it("returns 403 when stranger tries to delete private board", async () => {
    mockGetSession.mockResolvedValue(STRANGER_SESSION);
    mockFs.readFileSync.mockReturnValue(makeBoardJson({ ownerId: "user-1" }));
    mockCanDeleteBoard.mockReturnValue(false);

    const response = await DELETE(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    expect(response.status).toBe(403);
    expect(mockFs.unlinkSync).not.toHaveBeenCalled();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    expect(response.status).toBe(401);
    expect(mockFs.unlinkSync).not.toHaveBeenCalled();
  });

  it("returns ok when board file does not exist (idempotent)", async () => {
    mockFs.existsSync.mockReturnValue(false);

    const response = await DELETE(new Request("http://localhost/api/board/nonexistent"), makeParams("nonexistent"));
    expect(response.status).toBe(200);
    expect(mockFs.unlinkSync).not.toHaveBeenCalled();
  });

  it("broadcasts board-deleted event after deletion", async () => {
    mockFs.readFileSync.mockReturnValue(makeBoardJson({ ownerId: "user-1" }));

    await DELETE(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    expect(mockBroadcast).toHaveBeenCalledWith("board-1", "", "board-deleted", { boardId: "board-1" });
  });
});

// ─────────────────────────────────────────────
// FULL LIFECYCLE: Create → Read → Update → Delete
// ─────────────────────────────────────────────
describe("CRUD Lifecycle", () => {
  it("create → read → update → delete", async () => {
    // 1. CREATE: new board
    mockFs.existsSync.mockImplementation((p) => typeof p === "string" && !p.endsWith(".json"));

    const createReq = new Request("http://localhost/api/board/lifecycle-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "lifecycle-1", name: "New Project", lists: [], cards: {}, version: 0 }),
    });
    const createRes = await PUT(createReq, makeParams("lifecycle-1"));
    expect(createRes.status).toBe(200);
    const createData = await createRes.json();
    expect(createData.version).toBe(1);

    // Capture saved data
    const savedBoard = JSON.parse(mockFs.writeFileSync.mock.calls[0][1] as string);
    expect(savedBoard.ownerId).toBe("user-1");

    // 2. READ: load the board
    mockFs.existsSync.mockReturnValue(true);
    mockCheckBoardAccess.mockReturnValue({
      authorized: true, isOwner: true,
      board: { ...savedBoard } as never,
    });

    const readRes = await GET(new Request("http://localhost/api/board/lifecycle-1"), makeParams("lifecycle-1"));
    expect(readRes.status).toBe(200);
    const readData = await readRes.json();
    expect(readData.name).toBe("New Project");

    // 3. UPDATE: rename the board
    mockFs.readFileSync.mockReturnValue(JSON.stringify(savedBoard));

    const updateReq = new Request("http://localhost/api/board/lifecycle-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...savedBoard, name: "Renamed Project", version: 1 }),
    });
    const updateRes = await PUT(updateReq, makeParams("lifecycle-1"));
    expect(updateRes.status).toBe(200);
    const updateData = await updateRes.json();
    expect(updateData.version).toBe(2);

    const updatedBoard = JSON.parse(mockFs.writeFileSync.mock.calls[1][1] as string);
    expect(updatedBoard.name).toBe("Renamed Project");
    expect(updatedBoard.ownerId).toBe("user-1"); // preserved

    // 4. DELETE: remove the board
    mockFs.readFileSync.mockReturnValue(JSON.stringify(updatedBoard));
    mockCanDeleteBoard.mockReturnValue(true);

    const deleteRes = await DELETE(new Request("http://localhost/api/board/lifecycle-1"), makeParams("lifecycle-1"));
    expect(deleteRes.status).toBe(200);
    expect(mockFs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining("lifecycle-1.json"));
  });
});
