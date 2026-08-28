import { describe, expect, it, vi } from "vitest";
import { createDropHandler, handleDrop, handleDropPaths } from "./dnd";

function dataTransferWith(file?: { name: string; path?: string }): DataTransfer {
  return {
    files: file ? [file] : [],
  } as unknown as DataTransfer;
}

describe("drag-and-drop file seam", () => {
  it("opens a dropped markdown path", async () => {
    const onOpen = vi.fn();

    const result = await handleDrop(dataTransferWith({
      name: "notes.md",
      path: "/tmp/notes.md",
    }), {
      isDirty: false,
      onOpen,
    });

    expect(result).toMatchObject({
      kind: "opened",
      path: "/tmp/notes.md",
    });
    expect(onOpen).toHaveBeenCalledWith("/tmp/notes.md");
  });

  it("opens paths delivered by the Tauri native drop event", async () => {
    const onOpen = vi.fn();

    const result = await handleDropPaths(["/tmp/notes.md"], {
      isDirty: false,
      onOpen,
    });

    expect(result).toMatchObject({
      kind: "opened",
      path: "/tmp/notes.md",
    });
    expect(onOpen).toHaveBeenCalledWith("/tmp/notes.md");
  });

  it("ignores non-markdown files without opening them", async () => {
    const onOpen = vi.fn();

    const result = await handleDrop(dataTransferWith({
      name: "notes.txt",
      path: "/tmp/notes.txt",
    }), {
      isDirty: false,
      onOpen,
    });

    expect(result).toMatchObject({
      kind: "ignored",
      reason: "unsupported-file",
    });
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("uses the injected dirty guard before opening", async () => {
    const onOpen = vi.fn();
    const confirmDiscard = vi.fn().mockReturnValue(false);

    const result = await handleDrop(dataTransferWith({
      name: "notes.md",
      path: "/tmp/notes.md",
    }), {
      isDirty: () => true,
      confirmDiscard,
      onOpen,
    });

    expect(result).toMatchObject({ kind: "blocked", reason: "dirty" });
    expect(confirmDiscard).toHaveBeenCalledOnce();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("prevents the browser drop default and returns its result", async () => {
    const onOpen = vi.fn();
    const event = {
      dataTransfer: dataTransferWith({
        name: "notes.md",
        path: "/tmp/notes.md",
      }),
      preventDefault: vi.fn(),
    } as unknown as DragEvent;

    const result = await createDropHandler({ isDirty: false, onOpen })(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(result.kind).toBe("opened");
  });
});
