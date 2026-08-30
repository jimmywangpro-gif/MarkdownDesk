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
    mocks.invoke.mockResolvedValue([{ id: 31, path: "/tmp/launch.md" }]);

    await onFileOpened(handler);

    expect(mocks.invoke).toHaveBeenCalledWith("take_opened_files");
    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith("/tmp/launch.md");
  });

  it("does not replay a live native event when the listener re-registers", async () => {
    const handler = vi.fn();
    let resolveAcknowledgement: (() => void) | undefined;
    let takeCount = 0;
    mocks.invoke.mockImplementation((command) => {
      if (command === "take_opened_files") {
        takeCount += 1;
        return takeCount === 1
          ? Promise.resolve([])
          : Promise.resolve([{ id: 41, path: "/tmp/live.md" }]);
      }
      if (command === "ack_opened_files") {
        return new Promise((resolve) => {
          resolveAcknowledgement = () => resolve([]);
        });
      }
      return Promise.resolve(undefined);
    });

    await onFileOpened(handler);
    const [, firstCallback] = mocks.listen.mock.calls[0];
    firstCallback({ payload: { id: 41, path: "/tmp/live.md" } });
    expect(handler).toHaveBeenCalledWith("/tmp/live.md");
    expect(mocks.invoke).toHaveBeenCalledWith("ack_opened_files", { ids: [41] });

    await onFileOpened(handler);

    expect(handler).toHaveBeenCalledTimes(1);
    resolveAcknowledgement?.();
  });

  it("delivers distinct same-path native events separately", async () => {
    const handler = vi.fn();
    mocks.invoke.mockResolvedValue([
      { id: 51, path: "/tmp/same.md" },
      { id: 52, path: "/tmp/same.md" },
    ]);

    await onFileOpened(handler);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(1, "/tmp/same.md");
    expect(handler).toHaveBeenNthCalledWith(2, "/tmp/same.md");
  });

  it("delivers distinct later live events for the same path separately", async () => {
    const handler = vi.fn();

    await onFileOpened(handler);
    const [, callback] = mocks.listen.mock.calls[0];
    callback({ payload: { id: 61, path: "/tmp/later.md" } });
    callback({ payload: { id: 62, path: "/tmp/later.md" } });

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(1, "/tmp/later.md");
    expect(handler).toHaveBeenNthCalledWith(2, "/tmp/later.md");
  });

  it("keeps live delivery available when native transport is unavailable", async () => {
    const handler = vi.fn();
    mocks.invoke.mockRejectedValue(new Error("native transport unavailable"));

    await onFileOpened(handler);
    const [, callback] = mocks.listen.mock.calls[0];
    callback({ payload: "/tmp/browser.md" });

    expect(handler).toHaveBeenCalledWith("/tmp/browser.md");
  });
});
