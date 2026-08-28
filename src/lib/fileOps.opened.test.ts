import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listen: vi.fn(),
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: mocks.listen,
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mocks.invoke,
}));

import { onFileOpened } from "./fileOps";

describe("file-open event seam", () => {
  beforeEach(() => {
    mocks.listen.mockReset();
    mocks.invoke.mockReset();
    mocks.invoke.mockResolvedValue([]);
    mocks.listen.mockResolvedValue(vi.fn());
  });

  it("listens for paths delivered by the native file association", async () => {
    const handler = vi.fn();

    await onFileOpened(handler);

    expect(mocks.listen).toHaveBeenCalledWith("open-file", expect.any(Function));
    const [, callback] = mocks.listen.mock.calls[0];
    callback({ payload: "/tmp/from-finder.md" });

    expect(handler).toHaveBeenCalledWith("/tmp/from-finder.md");
  });

  it("replays a native open path queued before the frontend listener was ready", async () => {
    const handler = vi.fn();
    mocks.invoke.mockResolvedValue(["/tmp/launch.md"]);

    await onFileOpened(handler);

    expect(mocks.invoke).toHaveBeenCalledWith("take_opened_files");
    expect(handler).toHaveBeenCalledWith("/tmp/launch.md");
  });
});
