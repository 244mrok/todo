import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("@/lib/board-repo", () => ({
  getBoard: vi.fn(),
  saveBoard: vi.fn(),
  deleteBoard: vi.fn(),
}));

import { GET, PUT, DELETE } from "./route";
import { broadcast } from "@/lib/event-bus";
import { getSession } from "@/lib/session";
import { checkBoardAccess, canDeleteBoard } from "@/lib/board-auth";
import { getBoard, saveBoard, deleteBoard } from "@/lib/board-repo";

const mockBroadcast = vi.mocked(broadcast);
const mockGetSession = vi.mocked(getSession);
const mockCheckBoardAccess = vi.mocked(checkBoardAccess);
const mockCanDeleteBoard = vi.mocked(canDeleteBoard);
const mockGetBoard = vi.mocked(getBoard);
const mockSaveBoard = vi.mocked(saveBoard);
const mockDeleteBoard = vi.mocked(deleteBoard);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

const OWNER_SESSION = { userId: "user-1", email: "owner@test.com" };
const EDITOR_SESSION = { userId: "user-2", email: "editor@test.com" };
const STRANGER_SESSION = { userId: "user-3", email: "stranger@test.com" };

function makeBoard(overrides = {}) {
  return {
    id: "board-1",
    name: "Test Board",
    lists: [],
    cards: {},
    labelNames: {},
    version: 1,
    ownerId: "user-1",
    editors: ["user-2"],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue(OWNER_SESSION);
  mockGetBoard.mockResolvedValue(makeBoard() as never);
  mockSaveBoard.mockResolvedValue(undefined);
  mockDeleteBoard.mockResolvedValue(undefined);
  mockCheckBoardAccess.mockResolvedValue({
    authorized: true,
    isOwner: true,
    board: makeBoard() as never,
  });
  mockCanDeleteBoard.mockReturnValue(true);
});

// ─────────────────────────────────────────────
// CREATE (PUT new board)
// ─────────────────────────────────────────────
describe("CREATE — PUT /api/board/[id] (new board)", () => {
  beforeEach(() => {
    mockGetBoard.mockResolvedValue(null);
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

    expect(mockSaveBoard).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "user-1", editors: [], version: 1, name: "My Project" }),
    );
  });

  it("ignores ownerId/editors sent by client on creation", async () => {
    const boardData = { id: "board-new", name: "Hack", lists: [], cards: {}, version: 0, ownerId: "attacker", editors: ["attacker"] };
    const request = new Request("http://localhost/api/board/board-new", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(boardData),
    });

    await PUT(request, makeParams("board-new"));
    expect(mockSaveBoard).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "user-1", editors: [] }),
    );
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
    expect(mockSaveBoard).not.toHaveBeenCalled();
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
    const boardData = makeBoard({ version: 3 });
    mockCheckBoardAccess.mockResolvedValue({ authorized: true, isOwner: true, board: boardData as never });

    const response = await GET(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.id).toBe("board-1");
  });

  it("returns board data for editor", async () => {
    mockGetSession.mockResolvedValue(EDITOR_SESSION);
    mockCheckBoardAccess.mockResolvedValue({ authorized: true, isOwner: false, board: makeBoard() as never });

    const response = await GET(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    expect(response.status).toBe(200);
  });

  it("returns board data for public board (ownerId null)", async () => {
    mockGetSession.mockResolvedValue(STRANGER_SESSION);
    const boardData = makeBoard({ ownerId: null, editors: [] });
    mockCheckBoardAccess.mockResolvedValue({ authorized: true, isOwner: false, board: boardData as never });

    const response = await GET(new Request("http://localhost/api/board/demo-1"), makeParams("demo-1"));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ownerId).toBeNull();
  });

  it("returns 403 for stranger on private board", async () => {
    mockGetSession.mockResolvedValue(STRANGER_SESSION);
    mockCheckBoardAccess.mockResolvedValue({ authorized: false, isOwner: false, board: null });
    mockGetBoard.mockResolvedValue(makeBoard() as never); // exists but no access

    const response = await GET(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    expect(response.status).toBe(403);
  });

  it("returns 404 when board does not exist", async () => {
    mockCheckBoardAccess.mockResolvedValue({ authorized: false, isOwner: false, board: null });
    mockGetBoard.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/board/nonexistent"), makeParams("nonexistent"));
    expect(response.status).toBe(404);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    expect(response.status).toBe(401);
  });

  it("backfills version:0 for legacy boards", async () => {
    const oldBoard = makeBoard({ ownerId: null, editors: [] });
    delete (oldBoard as Record<string, unknown>).version;
    mockCheckBoardAccess.mockResolvedValue({ authorized: true, isOwner: false, board: oldBoard as never });

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
    mockGetBoard.mockResolvedValue(makeBoard({ version: 2 }) as never);

    const request = new Request("http://localhost/api/board/board-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Client-Id": "client-1" },
      body: JSON.stringify({ id: "board-1", name: "Updated Name", lists: [], cards: {}, version: 2 }),
    });

    const response = await PUT(request, makeParams("board-1"));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toEqual({ ok: true, version: 3 });

    expect(mockSaveBoard).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Updated Name", version: 3 }),
    );
  });

  it("saves for editor (non-owner with edit access)", async () => {
    mockGetSession.mockResolvedValue(EDITOR_SESSION);
    mockGetBoard.mockResolvedValue(makeBoard({ version: 1 }) as never);
    mockCheckBoardAccess.mockResolvedValue({
      authorized: true, isOwner: false,
      board: makeBoard() as never,
    });

    const request = new Request("http://localhost/api/board/board-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "board-1", name: "Editor Update", lists: [], cards: {}, version: 1 }),
    });

    const response = await PUT(request, makeParams("board-1"));
    expect(response.status).toBe(200);
  });

  it("returns 403 for stranger on private board", async () => {
    mockGetSession.mockResolvedValue(STRANGER_SESSION);
    mockGetBoard.mockResolvedValue(makeBoard() as never);
    mockCheckBoardAccess.mockResolvedValue({ authorized: false, isOwner: false, board: null });

    const request = new Request("http://localhost/api/board/board-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "board-1", name: "Hack", lists: [], cards: {}, version: 1 }),
    });

    const response = await PUT(request, makeParams("board-1"));
    expect(response.status).toBe(403);
    expect(mockSaveBoard).not.toHaveBeenCalled();
  });

  it("returns 409 on version conflict (client behind server)", async () => {
    mockGetBoard.mockResolvedValue(makeBoard({ version: 5 }) as never);

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
    expect(mockSaveBoard).not.toHaveBeenCalled();
  });

  it("preserves ownerId/editors from DB (tamper-proof)", async () => {
    mockGetBoard.mockResolvedValue(makeBoard({ ownerId: "user-1", editors: ["user-2"] }) as never);

    const request = new Request("http://localhost/api/board/board-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "board-1", name: "Tamper", lists: [], cards: {}, version: 1, ownerId: "attacker", editors: ["attacker"] }),
    });

    await PUT(request, makeParams("board-1"));
    expect(mockSaveBoard).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "user-1", editors: ["user-2"] }),
    );
  });

  it("broadcasts update to other connected clients", async () => {
    mockGetBoard.mockResolvedValue(makeBoard({ version: 1 }) as never);

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
    mockGetBoard.mockResolvedValue(makeBoard({ ownerId: "user-1" }) as never);

    const response = await DELETE(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    expect(response.status).toBe(200);
    expect(mockDeleteBoard).toHaveBeenCalledWith("board-1");
  });

  it("deletes public board (ownerId null) by any user", async () => {
    mockGetSession.mockResolvedValue(STRANGER_SESSION);
    mockGetBoard.mockResolvedValue(makeBoard({ ownerId: null }) as never);

    const response = await DELETE(new Request("http://localhost/api/board/demo-1"), makeParams("demo-1"));
    expect(response.status).toBe(200);
    expect(mockDeleteBoard).toHaveBeenCalled();
  });

  it("returns 403 when editor tries to delete (not owner)", async () => {
    mockGetSession.mockResolvedValue(EDITOR_SESSION);
    mockGetBoard.mockResolvedValue(makeBoard({ ownerId: "user-1" }) as never);
    mockCanDeleteBoard.mockReturnValue(false);

    const response = await DELETE(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    expect(response.status).toBe(403);
    expect(mockDeleteBoard).not.toHaveBeenCalled();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    expect(response.status).toBe(401);
    expect(mockDeleteBoard).not.toHaveBeenCalled();
  });

  it("returns ok when board does not exist (idempotent)", async () => {
    mockGetBoard.mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost/api/board/nonexistent"), makeParams("nonexistent"));
    expect(response.status).toBe(200);
    expect(mockDeleteBoard).not.toHaveBeenCalled();
  });

  it("broadcasts board-deleted event after deletion", async () => {
    mockGetBoard.mockResolvedValue(makeBoard({ ownerId: "user-1" }) as never);

    await DELETE(new Request("http://localhost/api/board/board-1"), makeParams("board-1"));
    expect(mockBroadcast).toHaveBeenCalledWith("board-1", "", "board-deleted", { boardId: "board-1" });
  });
});

// ─────────────────────────────────────────────
// FULL LIFECYCLE: Create → Read → Update → Delete
// ─────────────────────────────────────────────
describe("CRUD Lifecycle", () => {
  it("create → read → update → delete", async () => {
    // 1. CREATE
    mockGetBoard.mockResolvedValue(null);
    const createReq = new Request("http://localhost/api/board/lifecycle-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "lifecycle-1", name: "New Project", lists: [], cards: {}, version: 0 }),
    });
    const createRes = await PUT(createReq, makeParams("lifecycle-1"));
    expect(createRes.status).toBe(200);
    expect(mockSaveBoard).toHaveBeenCalledWith(expect.objectContaining({ ownerId: "user-1", version: 1 }));

    // 2. READ
    const savedBoard = makeBoard({ id: "lifecycle-1", name: "New Project", version: 1 });
    mockCheckBoardAccess.mockResolvedValue({ authorized: true, isOwner: true, board: savedBoard as never });
    const readRes = await GET(new Request("http://localhost/api/board/lifecycle-1"), makeParams("lifecycle-1"));
    expect(readRes.status).toBe(200);

    // 3. UPDATE
    mockGetBoard.mockResolvedValue(savedBoard as never);
    mockCheckBoardAccess.mockResolvedValue({ authorized: true, isOwner: true, board: savedBoard as never });
    const updateReq = new Request("http://localhost/api/board/lifecycle-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...savedBoard, name: "Renamed Project", version: 1 }),
    });
    const updateRes = await PUT(updateReq, makeParams("lifecycle-1"));
    expect(updateRes.status).toBe(200);
    expect(mockSaveBoard).toHaveBeenCalledWith(expect.objectContaining({ name: "Renamed Project", version: 2 }));

    // 4. DELETE
    mockGetBoard.mockResolvedValue(makeBoard({ id: "lifecycle-1", ownerId: "user-1" }) as never);
    const deleteRes = await DELETE(new Request("http://localhost/api/board/lifecycle-1"), makeParams("lifecycle-1"));
    expect(deleteRes.status).toBe(200);
    expect(mockDeleteBoard).toHaveBeenCalledWith("lifecycle-1");
  });
});
