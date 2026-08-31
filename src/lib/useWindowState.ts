import { useEffect, useRef, useState } from "react";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import { availableMonitors, getCurrentWindow, type Window } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { confirm } from "@tauri-apps/plugin-dialog";
import { saveSettings, type Settings, type WindowState } from "./settings";

const SAVE_DEBOUNCE_MS = 200;
const U32_MAX = 4_294_967_295;
const I32_MIN = -2_147_483_648;
const I32_MAX = 2_147_483_647;

interface UseWindowStateOptions {
  loaded: boolean;
  settings: Settings;
  windowState: WindowState;
  dirty: boolean;
  setWindowState: (windowState: WindowState) => void;
  onError: (message: string) => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validSize(value: unknown): number | null {
  if (!isFiniteNumber(value) || value <= 0) return null;
  const rounded = Math.round(value);
  return rounded > 0 && rounded <= U32_MAX ? rounded : null;
}

function validPosition(value: unknown): number | null {
  if (!isFiniteNumber(value)) return null;
  const rounded = Math.round(value);
  return rounded >= I32_MIN && rounded <= I32_MAX ? rounded : null;
}

function sameWindowState(left: WindowState, right: WindowState): boolean {
  return (
    left.width === right.width &&
    left.height === right.height &&
    left.x === right.x &&
    left.y === right.y &&
    left.maximized === right.maximized
  );
}

async function restoreWindow(window: Window, state: WindowState): Promise<void> {
  const width = validSize(state.width);
  const height = validSize(state.height);
  if (width === null || height === null) return;

  if (state.maximized === false) await window.unmaximize();
  await window.setSize(new PhysicalSize(width, height));

  const x = validPosition(state.x);
  const y = validPosition(state.y);
  if (x !== null && y !== null) {
    let monitors: Awaited<ReturnType<typeof availableMonitors>> = [];
    try {
      monitors = await availableMonitors();
    } catch {
      // Keep the native default position when monitor information is unavailable.
    }

    const monitor = monitors.find(({ workArea }) => {
      const left = workArea.position.x;
      const top = workArea.position.y;
      const right = left + workArea.size.width;
      const bottom = top + workArea.size.height;
      return x >= left && x < right && y >= top && y < bottom;
    });
    const position = monitor === undefined ? monitors[0]?.workArea.position : { x, y };
    if (position !== undefined) {
      const safeX = validPosition(position.x);
      const safeY = validPosition(position.y);
      if (safeX !== null && safeY !== null) {
        await window.setPosition(new PhysicalPosition(safeX, safeY));
      }
    }
  }

  if (state.maximized === true) await window.maximize();
}

export function useWindowState({
  loaded,
  settings,
  windowState,
  dirty,
  setWindowState,
  onError,
}: UseWindowStateOptions): void {
  const dirtyRef = useRef(dirty);
  const settingsRef = useRef(settings);
  const windowStateRef = useRef(windowState);
  const latestNativeStateRef = useRef<WindowState | null>(null);
  const setWindowStateRef = useRef(setWindowState);
  const [nativeAvailable, setNativeAvailable] = useState<boolean | null>(null);

  dirtyRef.current = dirty;
  settingsRef.current = settings;
  windowStateRef.current = windowState;
  setWindowStateRef.current = setWindowState;

  // Native Tauri close requests are handled below. This is the single browser
  // fallback, and it remains active until native close handling is available.
  useEffect(() => {
    if (nativeAvailable === true) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [nativeAvailable]);

  useEffect(() => {
    if (!loaded) return;

    let currentWindow: Window;
    try {
      currentWindow = getCurrentWindow();
    } catch {
      // Browser-only mode has no Tauri window object.
      setNativeAvailable(false);
      return;
    }

    setNativeAvailable(true);
    latestNativeStateRef.current = windowStateRef.current;

    let cancelled = false;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const cleanupFns: UnlistenFn[] = [];

    const reportError = (operation: string, error: unknown) => {
      if (!cancelled) onError(`${operation}：${errorMessage(error)}`);
    };

    const register = async (registerListener: () => Promise<UnlistenFn>) => {
      try {
        const unlisten = await registerListener();
        if (cancelled) {
          unlisten();
        } else {
          cleanupFns.push(unlisten);
        }
      } catch (error) {
        if (!cancelled) {
          setNativeAvailable(false);
          reportError("建立原生視窗監聽失敗", error);
        }
      }
    };

    const capture = async (): Promise<WindowState | null> => {
      try {
        const [size, position, maximized] = await Promise.all([
          currentWindow.outerSize(),
          currentWindow.outerPosition(),
          currentWindow.isMaximized(),
        ]);
        if (cancelled) return null;

        const width = validSize(size.width);
        const height = validSize(size.height);
        if (width === null || height === null) return null;

        const previous = latestNativeStateRef.current ?? windowStateRef.current;
        const next: WindowState = {
          width,
          height,
        };
        const x = validPosition(position.x);
        const y = validPosition(position.y);
        if (x !== null && y !== null) {
          next.x = x;
          next.y = y;
        } else {
          const previousX = validPosition(previous.x);
          const previousY = validPosition(previous.y);
          if (previousX !== null) next.x = previousX;
          if (previousY !== null) next.y = previousY;
        }
        if (typeof maximized === "boolean") {
          next.maximized = maximized;
        } else if (previous.maximized !== undefined) {
          next.maximized = previous.maximized;
        }

        latestNativeStateRef.current = next;
        if (sameWindowState(previous, next)) return next;
        windowStateRef.current = next;
        setWindowStateRef.current(next);
        return next;
      } catch (error) {
        reportError("儲存視窗狀態失敗", error);
        return null;
      }
    };

    const scheduleCapture = () => {
      if (cancelled) return;
      if (saveTimer !== null) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveTimer = null;
        void capture();
      }, SAVE_DEBOUNCE_MS);
    };

    const rememberNativeState = (patch: Partial<WindowState>) => {
      const previous = latestNativeStateRef.current ?? windowStateRef.current;
      latestNativeStateRef.current = { ...previous, ...patch };
    };

    const onResized = ({ payload }: { payload: { width: number; height: number } }) => {
      const width = validSize(payload.width);
      const height = validSize(payload.height);
      if (width !== null && height !== null) rememberNativeState({ width, height });
      scheduleCapture();
    };

    const onMoved = ({ payload }: { payload: { x: number; y: number } }) => {
      const x = validPosition(payload.x);
      const y = validPosition(payload.y);
      if (x !== null && y !== null) rememberNativeState({ x, y });
      scheduleCapture();
    };

    const onCloseRequested = async (event: { preventDefault: () => void }) => {
      const dirtyClose = dirtyRef.current;
      if (dirtyClose) {
        let confirmed: boolean;
        try {
          confirmed = await confirm("目前有未儲存的變更，確定要關閉視窗嗎？");
        } catch (error) {
          reportError("關閉視窗確認失敗", error);
          event.preventDefault();
          return;
        }
        if (!confirmed) {
          event.preventDefault();
          return;
        }
      }

      if (saveTimer !== null) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }

      const next = { ...(latestNativeStateRef.current ?? windowStateRef.current) };
      const savePromise = saveSettings({ ...settingsRef.current, windowState: next });
      void savePromise.catch(() => {});
    };

    const setup = async () => {
      try {
        await restoreWindow(currentWindow, windowStateRef.current);
      } catch (error) {
        reportError("視窗狀態還原失敗", error);
      }
      if (cancelled) return;

      await Promise.all([
        register(() => currentWindow.onResized(onResized)),
        register(() => currentWindow.onMoved(onMoved)),
        register(() => currentWindow.onCloseRequested(onCloseRequested)),
      ]);
    };

    void setup();

    return () => {
      cancelled = true;
      if (saveTimer !== null) clearTimeout(saveTimer);
      for (const unlisten of cleanupFns) unlisten();
    };
  }, [loaded, onError]);
}
