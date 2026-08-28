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

export function openFile(): Promise<OpenedFile | null> {
  return invoke("open_file");
}

export function readFile(path: string): Promise<OpenedFile> {
  return invoke("read_file", { path });
}

export function saveFile(path: string, content: string): Promise<SavedFile> {
  return invoke("save_file", { path, content });
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
    unlisten = await listen<string>("open-file", (event) => {
      if (registrationPhase) deliveredDuringRegistration.add(event.payload);
      handler(event.payload);
    });

    let pendingPaths: string[] = [];
    try {
      const queued = await invoke<unknown>("take_opened_files");
      if (Array.isArray(queued)) {
        pendingPaths = queued.filter((path): path is string => typeof path === "string");
      }
    } catch {
      // Browser-only mode and older bundles do not provide the native queue.
    }

    for (const path of pendingPaths) {
      if (!deliveredDuringRegistration.has(path)) handler(path);
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
