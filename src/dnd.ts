export type DropResult =
  | { kind: "opened"; path: string; message: string }
  | {
      kind: "ignored";
      reason: "no-file" | "unsupported-file" | "missing-path";
      message: string;
    }
  | { kind: "blocked"; reason: "dirty"; message: string };

export interface DropOptions {
  isDirty: boolean | (() => boolean);
  confirmDiscard?: () => boolean | Promise<boolean>;
  onOpen: (path: string) => void | Promise<void>;
}

type FileWithPath = File & { path?: string };

function getFilePath(file: FileWithPath): string | null {
  return typeof file.path === "string" && file.path.length > 0 ? file.path : null;
}

function isMarkdownName(name: string): boolean {
  return /\.md$/i.test(name);
}

function getDataTransfer(source: DragEvent | DataTransfer): DataTransfer | null {
  return "dataTransfer" in source ? source.dataTransfer : source;
}

async function openMarkdownPath(path: string, options: DropOptions): Promise<DropResult> {
  if (!isMarkdownName(path)) {
    return {
      kind: "ignored",
      reason: "unsupported-file",
      message: "已忽略：只支援 .md 檔案。",
    };
  }

  const dirty = typeof options.isDirty === "function" ? options.isDirty() : options.isDirty;
  if (dirty && !(await options.confirmDiscard?.())) {
    return {
      kind: "blocked",
      reason: "dirty",
      message: "已取消：目前有未儲存的變更。",
    };
  }

  await options.onOpen(path);
  return {
    kind: "opened",
    path,
    message: `準備開啟：${path}`,
  };
}

export async function handleDropPaths(
  paths: readonly string[],
  options: DropOptions,
): Promise<DropResult> {
  const path = paths[0];
  if (!path) {
    return {
      kind: "ignored",
      reason: "no-file",
      message: "已忽略：拖放內容沒有檔案。",
    };
  }
  return openMarkdownPath(path, options);
}

export async function handleDrop(
  source: DragEvent | DataTransfer,
  options: DropOptions,
): Promise<DropResult> {
  const dataTransfer = getDataTransfer(source);
  const file = dataTransfer?.files?.[0] as FileWithPath | undefined;

  if (!file) {
    return {
      kind: "ignored",
      reason: "no-file",
      message: "已忽略：拖放內容沒有檔案。",
    };
  }

  const path = getFilePath(file);
  if (!isMarkdownName(path ?? file.name)) {
    return {
      kind: "ignored",
      reason: "unsupported-file",
      message: "已忽略：只支援 .md 檔案。",
    };
  }

  if (!path) {
    return {
      kind: "ignored",
      reason: "missing-path",
      message: "已忽略：拖放的 Markdown 檔案沒有可用路徑。",
    };
  }

  return openMarkdownPath(path, options);
}

export function createDropHandler(
  options: DropOptions,
): (event: DragEvent) => Promise<DropResult> {
  return (event) => {
    event.preventDefault();
    return handleDrop(event, options);
  };
}
