import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listen: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: mocks.listen,
}));

import { onFileOpened } from "./fileOps";

describe("file-open event seam", () => {
  beforeEach(() => {
    mocks.listen.mockReset();
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
});
