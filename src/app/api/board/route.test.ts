import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/board-repo", () => ({
  listBoardsForUser: vi.fn(),
  seedDemoBoards: vi.fn(),
}));

import { GET } from "./route";
import { getSession } from "@/lib/session";
import { listBoardsForUser, seedDemoBoards } from "@/lib/board-repo";

const mockGetSession = vi.mocked(getSession);
const mockListBoardsForUser = vi.mocked(listBoardsForUser);
const mockSeedDemoBoards = vi.mocked(seedDemoBoards);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSession.mockResolvedValue({ userId: "user-1", email: "test@test.com" });
  mockSeedDemoBoards.mockResolvedValue(undefined);
});

describe("GET /api/board", () => {
  it("returns empty array when no boards exist", async () => {
    mockListBoardsForUser.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it("returns {id, name, ownerId, isOwner} for each board", async () => {
    mockListBoardsForUser.mockResolvedValue([
      { id: "board-1", name: "Project A", ownerId: null, isOwner: false },
      { id: "board-2", name: "Project B", ownerId: "user-1", isOwner: true },
    ]);

    const response = await GET();
    const data = await response.json();
    expect(data).toEqual([
      { id: "board-1", name: "Project A", ownerId: null, isOwner: false },
      { id: "board-2", name: "Project B", ownerId: "user-1", isOwner: true },
    ]);
  });

  it("seeds demo boards on first call", async () => {
    mockListBoardsForUser.mockResolvedValue([]);

    await GET();
    expect(mockSeedDemoBoards).toHaveBeenCalled();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
    expect(mockListBoardsForUser).not.toHaveBeenCalled();
  });

  it("filters boards by user access", async () => {
    mockListBoardsForUser.mockResolvedValue([
      { id: "board-1", name: "Public", ownerId: null, isOwner: false },
      { id: "board-3", name: "Shared", ownerId: "other-user", isOwner: false },
    ]);

    const response = await GET();
    const data = await response.json();
    expect(data).toHaveLength(2);
    expect(data.map((b: { id: string }) => b.id)).toEqual(["board-1", "board-3"]);
  });
});
