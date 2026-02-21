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

import fs from "fs";
import { GET, PUT, DELETE } from "./route";

const mockFs = vi.mocked(fs);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFs.existsSync.mockReturnValue(true);
});

describe("GET /api/board/[id]", () => {
  it("returns board data when file exists", async () => {
    const boardData = { id: "board-1", name: "Test", lists: [], cards: {} };
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
});

describe("PUT /api/board/[id]", () => {
  it("writes JSON file with board data", async () => {
    const boardData = { id: "board-1", name: "Updated", lists: [], cards: {} };
    const request = new Request("http://localhost/api/board/board-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(boardData),
    });

    const response = await PUT(request, makeParams("board-1"));
    const data = await response.json();
    expect(data).toEqual({ ok: true });
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("board-1.json"),
      JSON.stringify(boardData, null, 2),
      "utf-8",
    );
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
});
