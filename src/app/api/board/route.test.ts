import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fs before importing the route
vi.mock("fs", () => {
  return {
    default: {
      existsSync: vi.fn(),
      mkdirSync: vi.fn(),
      readdirSync: vi.fn(),
      readFileSync: vi.fn(),
    },
  };
});

import fs from "fs";
import { GET } from "./route";

const mockFs = vi.mocked(fs);

beforeEach(() => {
  vi.clearAllMocks();
  mockFs.existsSync.mockReturnValue(true);
});

describe("GET /api/board", () => {
  it("returns empty array when no board files exist", async () => {
    mockFs.readdirSync.mockReturnValue([] as unknown as ReturnType<typeof fs.readdirSync>);

    const response = await GET();
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it("returns {id, name} for each board file", async () => {
    mockFs.readdirSync.mockReturnValue(["board-1.json", "board-2.json"] as unknown as ReturnType<typeof fs.readdirSync>);
    mockFs.readFileSync
      .mockReturnValueOnce(JSON.stringify({ id: "board-1", name: "Project A", lists: [], cards: {} }))
      .mockReturnValueOnce(JSON.stringify({ id: "board-2", name: "Project B", lists: [], cards: {} }));

    const response = await GET();
    const data = await response.json();
    expect(data).toEqual([
      { id: "board-1", name: "Project A" },
      { id: "board-2", name: "Project B" },
    ]);
  });

  it("uses 'Untitled' when board has no name", async () => {
    mockFs.readdirSync.mockReturnValue(["board-1.json"] as unknown as ReturnType<typeof fs.readdirSync>);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ id: "board-1", name: "", lists: [], cards: {} }));

    const response = await GET();
    const data = await response.json();
    expect(data).toEqual([{ id: "board-1", name: "Untitled" }]);
  });

  it("ignores non-json files", async () => {
    mockFs.readdirSync.mockReturnValue(["board-1.json", ".DS_Store", "readme.txt"] as unknown as ReturnType<typeof fs.readdirSync>);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ id: "board-1", name: "Test" }));

    const response = await GET();
    const data = await response.json();
    expect(data).toHaveLength(1);
  });

  it("creates boards directory if it does not exist", async () => {
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readdirSync.mockReturnValue([] as unknown as ReturnType<typeof fs.readdirSync>);

    await GET();
    expect(mockFs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  });
});
