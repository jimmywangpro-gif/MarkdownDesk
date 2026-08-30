import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invoke,
}));

import { readFile, saveFile } from "./fileOps";

describe("public save seam", () => {
  beforeEach(() => {
    mocks.invoke.mockReset();
  });

  it("rejects when the on-disk file changed since the loaded version", async () => {
    const path = "/tmp/live.md";
    let onDisk = { content: "loaded", mtime: 41 };

    mocks.invoke.mockImplementation(async (command: string, args?: Record<string, unknown>) => {
      if (command === "read_file") return { path, ...onDisk };
      if (command === "save_file") {
        if (args?.expectedMtime !== onDisk.mtime) {
          throw new Error("external version conflict");
        }
        onDisk = { content: String(args.content), mtime: onDisk.mtime + 1 };
        return { path, mtime: onDisk.mtime };
      }
      return undefined;
    });

    const loaded = await readFile(path);
    onDisk = { content: "changed outside MarkdownDesk", mtime: 42 };

    await expect(saveFile(path, "edited in MarkdownDesk", loaded.mtime)).rejects.toThrow(
      "external version conflict",
    );
    expect(mocks.invoke).toHaveBeenLastCalledWith("save_file", {
      path,
      content: "edited in MarkdownDesk",
      expectedMtime: 41,
    });
    expect(onDisk.content).toBe("changed outside MarkdownDesk");
  });
});
