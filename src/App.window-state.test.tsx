import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import App from "./App";
import { SettingsProvider } from "./lib/SettingsContext";

type WindowEventHandler<T> = (event: { payload: T }) => void;
type CloseEventHandler = (event: { preventDefault: () => void }) => void | Promise<void>;

const windowMocks = vi.hoisted(() => {
  const currentWindow = {
    outerSize: vi.fn(),
    outerPosition: vi.fn(),
    isMaximized: vi.fn(),
    setSize: vi.fn(),
    setPosition: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    onResized: vi.fn(),
    onMoved: vi.fn(),
    onCloseRequested: vi.fn(),
  };

  return {
    currentWindow,
    availableMonitors: vi.fn(),
    getCurrentWindow: vi.fn(() => currentWindow),
    resizedHandler: undefined as WindowEventHandler<{ width: number; height: number }> | undefined,
    movedHandler: undefined as WindowEventHandler<{ x: number; y: number }> | undefined,
    closeHandler: undefined as CloseEventHandler | undefined,
    unlistenResized: vi.fn(),
    unlistenMoved: vi.fn(),
    unlistenClose: vi.fn(),
  };
});

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: windowMocks.getCurrentWindow,
  availableMonitors: windowMocks.availableMonitors,
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

const mockedInvoke = vi.mocked(invoke);

const rangePrototype = Object.getPrototypeOf(document.createRange()) as object;
if (!("getClientRects" in rangePrototype)) {
  Object.defineProperty(rangePrototype, "getClientRects", {
    configurable: true,
    value: () => [],
  });
}

function renderApp() {
  return render(
    <SettingsProvider>
      <App />
    </SettingsProvider>,
  );
}

async function waitForWindowListeners() {
  await waitFor(() => {
    expect(windowMocks.resizedHandler).toBeTypeOf("function");
    expect(windowMocks.movedHandler).toBeTypeOf("function");
    expect(windowMocks.closeHandler).toBeTypeOf("function");
  });
}

async function setEditorText(value: string) {
  const editor = screen.getByTestId("editor-input");
  await act(async () => {
    editor.textContent = value;
    fireEvent.input(editor, { inputType: "insertText", data: value });
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("window state and native close guard", () => {
  beforeEach(() => {
    mockedInvoke.mockReset();
    mockedInvoke.mockImplementation(async (command) => {
      if (command === "load_settings") {
        return {
          windowState: {
            width: 1280,
            height: 720,
            x: -12,
            y: 34,
            maximized: true,
          },
        };
      }
      if (command === "recent_files_list") return [];
      return undefined;
    });

    windowMocks.getCurrentWindow.mockClear();
    windowMocks.resizedHandler = undefined;
    windowMocks.movedHandler = undefined;
    windowMocks.closeHandler = undefined;
    windowMocks.unlistenResized.mockClear();
    windowMocks.unlistenMoved.mockClear();
    windowMocks.unlistenClose.mockClear();
    windowMocks.currentWindow.outerSize.mockReset().mockResolvedValue({ width: 1400, height: 800 });
    windowMocks.currentWindow.outerPosition.mockReset().mockResolvedValue({ x: -20, y: 40 });
    windowMocks.currentWindow.isMaximized.mockReset().mockResolvedValue(false);
    windowMocks.availableMonitors.mockReset().mockResolvedValue([
      {
        name: "Default Display",
        size: { width: 2560, height: 1600 },
        position: { x: 0, y: 0 },
        workArea: {
          position: { x: -2000, y: -1000 },
          size: { width: 4000, height: 3000 },
        },
        scaleFactor: 1,
      },
    ]);
    windowMocks.currentWindow.setSize.mockReset().mockResolvedValue(undefined);
    windowMocks.currentWindow.setPosition.mockReset().mockResolvedValue(undefined);
    windowMocks.currentWindow.maximize.mockReset().mockResolvedValue(undefined);
    windowMocks.currentWindow.unmaximize.mockReset().mockResolvedValue(undefined);
    windowMocks.currentWindow.onResized.mockReset().mockImplementation(
      async (handler: WindowEventHandler<{ width: number; height: number }>) => {
        windowMocks.resizedHandler = handler;
        return windowMocks.unlistenResized;
      },
    );
    windowMocks.currentWindow.onMoved.mockReset().mockImplementation(
      async (handler: WindowEventHandler<{ x: number; y: number }>) => {
        windowMocks.movedHandler = handler;
        return windowMocks.unlistenMoved;
      },
    );
    windowMocks.currentWindow.onCloseRequested.mockReset().mockImplementation(
      async (handler: CloseEventHandler) => {
        windowMocks.closeHandler = handler;
        return windowMocks.unlistenClose;
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("restores saved size, position, and maximized state after settings load", async () => {
    renderApp();
    await waitFor(() => expect(windowMocks.currentWindow.setSize).toHaveBeenCalledOnce());

    expect(windowMocks.currentWindow.setSize).toHaveBeenCalledWith(
      expect.objectContaining({ type: "Physical", width: 1280, height: 720 }),
    );
    expect(windowMocks.currentWindow.setPosition).toHaveBeenCalledWith(
      expect.objectContaining({ type: "Physical", x: -12, y: 34 }),
    );
    expect(windowMocks.currentWindow.maximize).toHaveBeenCalledOnce();
    expect(screen.getByTestId("editor-input")).toBeTruthy();
  });

  it("moves an off-screen saved position into the monitor work area while preserving size and maximized state", async () => {
    mockedInvoke.mockImplementation(async (command) => {
      if (command === "load_settings") {
        return {
          windowState: {
            width: 1280,
            height: 720,
            x: -2000,
            y: -1500,
            maximized: true,
          },
        };
      }
      if (command === "recent_files_list") return [];
      return undefined;
    });
    windowMocks.availableMonitors.mockResolvedValue([
      {
        name: "Built-in Display",
        size: { width: 2560, height: 1600 },
        position: { x: 0, y: 0 },
        workArea: {
          position: { x: 0, y: 24 },
          size: { width: 1440, height: 876 },
        },
        scaleFactor: 2,
      },
    ]);

    renderApp();
    await waitFor(() => expect(windowMocks.currentWindow.setSize).toHaveBeenCalledOnce());

    expect(windowMocks.availableMonitors).toHaveBeenCalledOnce();
    expect(windowMocks.currentWindow.setSize).toHaveBeenCalledWith(
      expect.objectContaining({ type: "Physical", width: 1280, height: 720 }),
    );
    expect(windowMocks.currentWindow.setPosition).toHaveBeenCalledWith(
      expect.objectContaining({ type: "Physical", x: 0, y: 24 }),
    );
    expect(windowMocks.currentWindow.unmaximize).not.toHaveBeenCalled();
    expect(windowMocks.currentWindow.maximize).toHaveBeenCalledOnce();
  });

  it("keeps valid geometry safe when no monitor information is available", async () => {
    mockedInvoke.mockImplementation(async (command) => {
      if (command === "load_settings") {
        return {
          windowState: {
            width: 1024,
            height: 768,
            x: -3000,
            y: -2000,
            maximized: false,
          },
        };
      }
      if (command === "recent_files_list") return [];
      return undefined;
    });
    windowMocks.availableMonitors.mockResolvedValue([]);

    renderApp();
    await waitFor(() => expect(windowMocks.currentWindow.setSize).toHaveBeenCalledOnce());

    expect(windowMocks.availableMonitors).toHaveBeenCalledOnce();
    expect(windowMocks.currentWindow.setSize).toHaveBeenCalledWith(
      expect.objectContaining({ type: "Physical", width: 1024, height: 768 }),
    );
    expect(windowMocks.currentWindow.setPosition).not.toHaveBeenCalled();
    expect(windowMocks.currentWindow.unmaximize).toHaveBeenCalledOnce();
    expect(windowMocks.currentWindow.maximize).not.toHaveBeenCalled();
  });

  it("reports restore failures without blocking the editor", async () => {
    windowMocks.currentWindow.setSize.mockRejectedValueOnce(new Error("window unavailable"));
    renderApp();

    await waitFor(() =>
      expect(screen.getByTestId("operation-status").textContent).toContain("視窗狀態還原失敗"),
    );
    expect(screen.getByTestId("editor-input")).toBeTruthy();
  });

  it("debounces native geometry changes and persists the latest valid state", async () => {
    renderApp();
    await waitForWindowListeners();
    mockedInvoke.mockClear();

    await act(async () => {
      windowMocks.movedHandler?.({ payload: { x: -20, y: 40 } });
      windowMocks.resizedHandler?.({ payload: { width: 1400, height: 800 } });
      await new Promise((resolve) => setTimeout(resolve, 260));
    });

    await waitFor(() =>
      expect(mockedInvoke).toHaveBeenCalledWith(
        "save_settings",
        expect.objectContaining({
          settings: expect.objectContaining({
            windowState: {
              width: 1400,
              height: 800,
              x: -20,
              y: 40,
              maximized: false,
            },
          }),
        }),
      ),
    );
  });

  it("flushes pending native geometry before an accepted close resolves", async () => {
    renderApp();
    await waitForWindowListeners();
    mockedInvoke.mockClear();

    const latestState = {
      width: 1536,
      height: 864,
      x: -88,
      y: 112,
      maximized: true,
    };
    windowMocks.currentWindow.outerSize.mockResolvedValue(latestState);
    windowMocks.currentWindow.outerPosition.mockResolvedValue({ x: latestState.x, y: latestState.y });
    windowMocks.currentWindow.isMaximized.mockResolvedValue(latestState.maximized);

    windowMocks.movedHandler?.({ payload: { x: latestState.x, y: latestState.y } });
    windowMocks.resizedHandler?.({
      payload: { width: latestState.width, height: latestState.height },
    });

    let saveStarted = false;
    let closeResolved = false;
    let resolveSave: () => void = () => {};
    const saveFinished = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    mockedInvoke.mockImplementation(async (command) => {
      if (command === "save_settings") {
        saveStarted = true;
        await saveFinished;
      }
      return undefined;
    });

    const closeEvent = { preventDefault: vi.fn() };
    let closePromise: Promise<void> | undefined;
    act(() => {
      closePromise = Promise.resolve(windowMocks.closeHandler?.(closeEvent)).then(() => {
        closeResolved = true;
      });
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(saveStarted).toBe(true);
    expect(closeResolved).toBe(false);
    expect(mockedInvoke).toHaveBeenCalledWith(
      "save_settings",
      expect.objectContaining({
        settings: expect.objectContaining({ windowState: latestState }),
      }),
    );

    resolveSave();
    await act(async () => {
      await closePromise;
      await new Promise((resolve) => setTimeout(resolve, 260));
    });

    expect(closeResolved).toBe(true);
    expect(closeEvent.preventDefault).not.toHaveBeenCalled();
    expect(mockedInvoke.mock.calls.filter(([command]) => command === "save_settings")).toHaveLength(1);
  });

  it("does not wait for unresolved native geometry before an accepted close resolves", async () => {
    renderApp();
    await waitForWindowListeners();
    mockedInvoke.mockClear();

    const latestState = {
      width: 1536,
      height: 864,
      x: -88,
      y: 112,
      maximized: true,
    };
    const unresolvedGeometry = new Promise<never>(() => {});
    windowMocks.currentWindow.outerSize.mockReturnValue(unresolvedGeometry);
    windowMocks.currentWindow.outerPosition.mockReturnValue(unresolvedGeometry);
    windowMocks.currentWindow.isMaximized.mockReturnValue(unresolvedGeometry);

    windowMocks.movedHandler?.({ payload: { x: latestState.x, y: latestState.y } });
    windowMocks.resizedHandler?.({
      payload: { width: latestState.width, height: latestState.height },
    });

    let resolveSave: () => void = () => {};
    const saveFinished = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    let saveStarted = false;
    let notifySaveStarted: () => void = () => {};
    const saveStartedPromise = new Promise<void>((resolve) => {
      notifySaveStarted = resolve;
    });
    mockedInvoke.mockImplementation(async (command) => {
      if (command === "save_settings") {
        saveStarted = true;
        notifySaveStarted();
        await saveFinished;
      }
      return undefined;
    });

    const closeEvent = { preventDefault: vi.fn() };
    const closePromise = windowMocks.closeHandler?.(closeEvent) ?? Promise.resolve();
    let startTimeout: ReturnType<typeof setTimeout> | undefined;
    const closeStart = await Promise.race([
      saveStartedPromise.then(() => "save-started" as const),
      new Promise<"timed-out">((resolve) => {
        startTimeout = setTimeout(() => resolve("timed-out"), 100);
      }),
    ]);
    if (startTimeout !== undefined) clearTimeout(startTimeout);

    expect(closeStart).toBe("save-started");
    expect(saveStarted).toBe(true);
    expect(closeEvent.preventDefault).not.toHaveBeenCalled();
    expect(windowMocks.currentWindow.outerSize).not.toHaveBeenCalled();
    expect(windowMocks.currentWindow.outerPosition).not.toHaveBeenCalled();
    expect(windowMocks.currentWindow.isMaximized).not.toHaveBeenCalled();
    expect(mockedInvoke).toHaveBeenCalledWith(
      "save_settings",
      expect.objectContaining({
        settings: expect.objectContaining({ windowState: latestState }),
      }),
    );

    let closeResolved = false;
    void closePromise.then(() => {
      closeResolved = true;
    });
    await Promise.resolve();
    expect(closeResolved).toBe(false);

    resolveSave();
    let finishTimeout: ReturnType<typeof setTimeout> | undefined;
    const closeFinish = await Promise.race([
      closePromise.then(() => "resolved" as const),
      new Promise<"timed-out">((resolve) => {
        finishTimeout = setTimeout(() => resolve("timed-out"), 100);
      }),
    ]);
    if (finishTimeout !== undefined) clearTimeout(finishTimeout);

    expect(closeFinish).toBe("resolved");
  });

  it("does not overwrite normal geometry with an invalid native size", async () => {
    renderApp();
    await waitForWindowListeners();
    mockedInvoke.mockClear();
    windowMocks.currentWindow.outerSize.mockResolvedValueOnce({ width: 0, height: 800 });

    await act(async () => {
      windowMocks.resizedHandler?.({ payload: { width: 0, height: 800 } });
      await new Promise((resolve) => setTimeout(resolve, 260));
    });

    expect(mockedInvoke.mock.calls.some(([command]) => command === "save_settings")).toBe(false);
  });

  it("prevents a dirty native close when discard is declined", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderApp();
    await waitForWindowListeners();
    await setEditorText("unsaved");
    mockedInvoke.mockClear();
    windowMocks.movedHandler?.({ payload: { x: -88, y: 112 } });
    windowMocks.resizedHandler?.({ payload: { width: 1536, height: 864 } });

    const event = { preventDefault: vi.fn() };
    await act(async () => {
      await windowMocks.closeHandler?.(event);
    });

    expect(window.confirm).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(mockedInvoke.mock.calls.filter(([command]) => command === "save_settings")).toHaveLength(0);
  });

  it("allows a clean or confirmed native close", async () => {
    const cleanEvent = { preventDefault: vi.fn() };
    renderApp();
    await waitForWindowListeners();

    await act(async () => {
      await windowMocks.closeHandler?.(cleanEvent);
    });
    expect(cleanEvent.preventDefault).not.toHaveBeenCalled();

    await setEditorText("unsaved");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const confirmedEvent = { preventDefault: vi.fn() };
    await act(async () => {
      await windowMocks.closeHandler?.(confirmedEvent);
    });
    expect(confirmedEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("unlistens every native window listener on unmount", async () => {
    const view = renderApp();
    await waitForWindowListeners();

    view.unmount();

    expect(windowMocks.unlistenResized).toHaveBeenCalledOnce();
    expect(windowMocks.unlistenMoved).toHaveBeenCalledOnce();
    expect(windowMocks.unlistenClose).toHaveBeenCalledOnce();
  });

  it("does not duplicate native listeners when dirty state changes", async () => {
    renderApp();
    await waitForWindowListeners();
    await setEditorText("unsaved");

    expect(windowMocks.currentWindow.onResized).toHaveBeenCalledOnce();
    expect(windowMocks.currentWindow.onMoved).toHaveBeenCalledOnce();
    expect(windowMocks.currentWindow.onCloseRequested).toHaveBeenCalledOnce();
  });

  it("keeps browser-only rendering safe when Tauri is unavailable", async () => {
    windowMocks.getCurrentWindow.mockImplementationOnce(() => {
      throw new Error("not running in Tauri");
    });
    renderApp();

    await waitFor(() => expect(screen.getByTestId("editor-input")).toBeTruthy());
    await setEditorText("unsaved in browser");
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);

    expect(screen.queryByTestId("operation-status")).toBeNull();
    expect(event.defaultPrevented).toBe(true);
  });
});
