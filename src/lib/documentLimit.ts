export const MAX_MARKDOWN_SOURCE_BYTES = 8 * 1024 * 1024;

const utf8Encoder = new TextEncoder();

export function isMarkdownSourceWithinLimit(source: string): boolean {
  return utf8Encoder.encode(source).byteLength <= MAX_MARKDOWN_SOURCE_BYTES;
}

export const MARKDOWN_SOURCE_LIMIT_MESSAGE = `無法開啟檔案：Markdown 內容超過 ${MAX_MARKDOWN_SOURCE_BYTES / (1024 * 1024)} MiB 上限。`;
