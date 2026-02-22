import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fs before importing the route
vi.mock("fs", () => {
  return {
    default: {
      existsSync: vi.fn(),
      mkdirSync: vi.fn(),
      readdirSync: vi.fn(),
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
    },
  };
});

vi.mock("@/lib/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/demo-boards", () => ({
  seedDemoBoards: vi.fn(),
}));

import fs from "fs";
import { GET } from "./route";
import { getSession } from "@/lib/session";

const mockFs = vi.mocked(fs);
const mockGetSession = vi.mocked(getSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockFs.existsSync.mockReturnValue(true);
  mockGetSession.mockResolvedValue({ userId: "user-1", email: "test@test.com" });
});

describe("GET /api/board", () => {
  it("returns empty array when no board files exist", async () => {
    mockFs.readdirSync.mockReturnValue([] as unknown as ReturnType<typeof fs.readdirSync>);

    const response = await GET();
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it("returns {id, name, ownerId, isOwner} for each board file", async () => {
    mockFs.readdirSync.mockReturnValue(["board-1.json", "board-2.json"] as unknown as ReturnType<typeof fs.readdirSync>);
    mockFs.readFileSync
      .mockReturnValueOnce(JSON.stringify({ id: "board-1", name: "Project A", ownerId: null, editors: [] }))
      .mockReturnValueOnce(JSON.stringify({ id: "board-2", name: "Project B", ownerId: "user-1", editors: [] }));

    const response = await GET();
    const data = await response.json();
    expect(data).toEqual([
      { id: "board-1", name: "Project A", ownerId: null, isOwner: false },
      { id: "board-2", name: "Project B", ownerId: "user-1", isOwner: true },
    ]);
  });

  it("uses 'Untitled' when board has no name", async () => {
    mockFs.readdirSync.mockReturnValue(["board-1.json"] as unknown as ReturnType<typeof fs.readdirSync>);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ id: "board-1", name: "", ownerId: null, editors: [] }));

    const response = await GET();
    const data = await response.json();
    expect(data).toEqual([{ id: "board-1", name: "Untitled", ownerId: null, isOwner: false }]);
  });

  it("ignores non-json files", async () => {
    mockFs.readdirSync.mockReturnValue(["board-1.json", ".DS_Store", "readme.txt"] as unknown as ReturnType<typeof fs.readdirSync>);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ id: "board-1", name: "Test", ownerId: null, editors: [] }));

    const response = await GET();
    const data = await response.json();
    expect(data).toHaveLength(1);
  });

  it("filters boards by access", async () => {
    mockFs.readdirSync.mockReturnValue(["board-1.json", "board-2.json", "board-3.json"] as unknown as ReturnType<typeof fs.readdirSync>);
    mockFs.readFileSync
      .mockReturnValueOnce(JSON.stringify({ id: "board-1", name: "Public", ownerId: null, editors: [] }))
      .mockReturnValueOnce(JSON.stringify({ id: "board-2", name: "Other User", ownerId: "other-user", editors: [] }))
      .mockReturnValueOnce(JSON.stringify({ id: "board-3", name: "Shared", ownerId: "other-user", editors: ["user-1"] }));

    const response = await GET();
    const data = await response.json();
    expect(data).toHaveLength(2);
    expect(data.map((b: { id: string }) => b.id)).toEqual(["board-1", "board-3"]);
  });
});
