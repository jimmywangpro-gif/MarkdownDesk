import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type { UnlistenFn };

export interface OpenedFile {
  path: string;
  content: string;
  mtime: number;
}

export interface SavedFile {
  path: string;
  mtime: number;
}

export interface RecentFile {
  path: string;
  mtime: number;
}

interface NativeOpenedFileEvent {
  id: number;
  path: string;
}

const deliveredNativeEventIds = new Set<number>();

function parseNativeOpenedFileEvent(payload: unknown): NativeOpenedFileEvent | null {
  if (typeof payload !== "object" || payload === null) return null;
  const event = payload as { id?: unknown; path?: unknown };
  if (
    typeof event.id !== "number" ||
    !Number.isSafeInteger(event.id) ||
    typeof event.path !== "string"
  ) {
    return null;
  }
  return { id: event.id, path: event.path };
}

export function openFile(): Promise<OpenedFile | null> {
  return invoke("open_file");
}

export function readFile(path: string): Promise<OpenedFile> {
  return invoke("read_file", { path });
}

export function saveFile(
  path: string,
  content: string,
  expectedMtime: number,
): Promise<SavedFile> {
  return invoke("save_file", { path, content, expectedMtime });
}

export function saveFileAs(content: string): Promise<SavedFile | null> {
  return invoke("save_file_as", { content });
}

export function recentFilesList(): Promise<RecentFile[]> {
  return invoke("recent_files_list");
}

export function recentFilesAdd(path: string): Promise<void> {
  return invoke("recent_files_add", { path });
}

export function recentFilesClear(): Promise<void> {
  return invoke("recent_files_clear");
}

export function watchFile(path: string): Promise<void> {
  return invoke("watch_file", { path });
}

export function unwatchFile(path: string): Promise<void> {
  return invoke("unwatch_file", { path });
}

export async function onFileOpened(
  handler: (path: string) => void,
): Promise<UnlistenFn> {
  const deliveredDuringRegistration = new Set<string>();
  let registrationPhase = true;
  let unlisten: UnlistenFn | undefined;

  try {
    unlisten = await listen<NativeOpenedFileEvent | string>("open-file", (event) => {
      const nativeEvent = parseNativeOpenedFileEvent(event.payload);
      if (!nativeEvent) {
        if (typeof event.payload !== "string") return;
        if (registrationPhase) deliveredDuringRegistration.add(event.payload);
        handler(event.payload);
        return;
      }

      if (deliveredNativeEventIds.has(nativeEvent.id)) return;
      deliveredNativeEventIds.add(nativeEvent.id);
      handler(nativeEvent.path);
      void invoke("ack_opened_files", { ids: [nativeEvent.id] })
        .then(() => deliveredNativeEventIds.delete(nativeEvent.id))
        .catch(() => {
          // Browser-only mode and older bundles do not provide native acknowledgements.
        });
    });

    let pendingEvents: Array<NativeOpenedFileEvent | string> = [];
    try {
      const queued = await invoke<unknown>("take_opened_files");
      if (Array.isArray(queued)) {
        pendingEvents = queued.filter((event): event is NativeOpenedFileEvent | string => {
          return typeof event === "string" || parseNativeOpenedFileEvent(event) !== null;
        });
      }
    } catch {
      // Browser-only mode and older bundles do not provide the native queue.
    }

    for (const event of pendingEvents) {
      if (typeof event === "string") {
        if (!deliveredDuringRegistration.has(event)) handler(event);
        continue;
      }
      if (deliveredNativeEventIds.delete(event.id)) continue;
      handler(event.path);
    }
    registrationPhase = false;
    return unlisten;
  } catch {
    registrationPhase = false;
    unlisten?.();
    return () => {};
  }
}

export async function onFileChanged(
  handler: (path: string) => void,
): Promise<UnlistenFn> {
  try {
    return await listen<{ path: string }>("file-changed", (event) => {
      handler(event.payload.path);
    });
  } catch {
    return () => {};
  }
}
