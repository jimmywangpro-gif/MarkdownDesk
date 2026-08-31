# MarkdownDesk 規格書（SPEC）

- 版本：1.0
- 日期：2026-08-28
- 狀態：ready-for-agent
- 產出流程：mp-grill-me（已裁示）→ mp-to-spec

## Problem Statement

使用者在一台機器上撰寫與閱讀 Markdown 文件時，現有工具不是太重（Electron 系動輒 100MB+）、就是不跨平台（鎖定單一 OS），或編輯與預覽割裂（要開兩個視窗、自己對位置）。需要一個「單一執行檔、拷貝即用、三平台一致」的輕量 Markdown 編輯/檢視工具。

## Solution

MarkdownDesk：以 Tauri v2 打包的桌面應用。編輯與預覽分屏並排、即時渲染、捲動同步；支援 GFM 完整語法；原生檔案開啟/儲存/最近檔案與外部修改重載；可匯出 HTML 與 PDF；亮/暗主題與字級設定。最終交付 Windows（NSIS）、Linux（deb/AppImage）、macOS（dmg）三種安裝包，本體執行檔單一、體積小（目標 ≤ 15MB 安裝後）。

## User Stories

1. As a writer, I want to open any `.md` file from a native file dialog, so that I can start working on an existing document immediately.
2. As a writer, I want a live preview beside my editor, so that I can see the rendered result while typing without switching windows.
3. As a writer, I want preview scrolling to follow my cursor position in the editor, so that I never lose my place in long documents.
4. As a writer, I want tables rendered per GFM, so that I can author structured data without learning HTML.
5. As a writer, I want task lists (`- [ ]` / `- [x]`) rendered with interactive checkboxes in preview, so that I can track TODOs visually.
6. As a writer, I want fenced code blocks syntax-highlighted, so that technical content is readable.
7. As a writer, I want strikethrough (`~~text~~`) and autolinks supported, so that common GFM idioms just work.
8. As a writer, I want to save with Cmd/Ctrl+S and get "Save As" when the file has no path yet, so that saving always behaves like a desktop app.
9. As a writer, I want a "recent files" list, so that I can jump back to documents I was working on.
10. As a writer, I want the app to detect external modifications and offer reload, so that I never accidentally overwrite changes made by another tool.
11. As a writer, I want a dirty-state guard on close/open, so that unsaved edits are never silently lost.
12. As a reader, I want a view-only mode that hides the editor pane, so that I can read documents distraction-free.
13. As a reader, I want to export the document to a standalone styled HTML file, so that I can share it with anyone in a browser.
14. As a reader, I want to export/print the document to PDF, so that I can archive or send formal copies.
15. As a user, I want light and dark themes, so that the app matches my system and eye comfort.
16. As a user, I want adjustable editor/preview font size, so that I can read comfortably.
17. As a user, I want my settings persisted across launches, so that I configure the app once.
18. As a user, I want the same experience on Windows, Linux, and macOS from a single installed binary, so that I can move between machines without relearning.
19. As a user, I want drag-and-drop of a `.md` file onto the window to open it, so that opening files matches my file manager habits.
20. As a user, I want external links in preview to open in the system browser, so that the app stays a document tool and never embeds a web browser.
21. As a user, I want rendered preview sanitized against script injection, so that opening an untrusted document cannot execute code.
22. As a user, I want window size/position remembered, so that the app opens the way I left it.

## Implementation Decisions

- 技術棧（已裁示）：**Tauri v2 + Rust 後端 + TypeScript/React 前端 + 受控原生 textarea editor**。CodeMirror 6 曾完成 migration，但 packaged macOS WebKit 出現 editor 空白 regression；v1 自用穩定性優先，已撤回該依賴與 implementation。
- 渲染管線：前端 TypeScript 純函式 `renderMarkdown(source: string): string`（unified 生態：remark-parse + remark-gfm + rehype-highlight + sanitize），回傳 HTML 字串交由預覽窗格注入。**這是全案最高、也是首選測試接縫。**
- Rust 端職責僅限必須原生之處：檔案對話框（open/save）、最近檔案、外部檔案監看（notify crate）、匯出輔助；以 Tauri command 暴露，構成第二接縫（IPC boundary）。
- PDF 匯出走 webview 原生列印（列印至 PDF），不引入 headless Chromium，守住體積目標。
- 狀態管理：React hooks + 輕量 store（zustand），不自建重框架。
- 設定持久化：JSON 存於 app data 目錄（tauri-plugin-store 或同級自寫 command）。
- 主題：CSS custom properties token 化（light/dark 兩套），編輯器與預覽共用 token。
- 安全性：渲染輸出經 sanitize；嚴格 CSP；`window.open`/外部連結一律導向系統瀏覽器。
- 即時渲染以 debounce（~150ms）節流；同步捲動以編輯器游標所在區塊錨定預覽對應元素。

## Testing Decisions

- 好測試的定義：只驗外部可觀察行為（輸入 markdown 原始碼 → 預期 HTML 結構 / 檔案狀態變化 / UI 互動結果），不驗實作細節。
- 接縫 1 — `renderMarkdown` 純函式：golden tests 涵蓋 GFM 全元素（標題/清單/表格/任務清單/刪除線/程式碼高亮/引用/連結/自動連結）與 sanitize 案例（script/事件屬性剝除）。**全案主要回歸資產。**
- 接縫 2 — Rust command handlers：`#[test]` + 真實暫存目錄 I/O（開啟/儲存/最近檔案/外部修改偵測）。
- 接縫 3 — React 元件互動：vitest + testing-library（分屏模式切換、dirty guard、拖放）。
- 打包冒煙：macOS 本機完整驗證（dmg 安裝→啟動→開檔）；Windows/Linux 產出後標記「需目標平台驗證」。
- Prior art：MarkdownApp（iOS）之 golden-test 哲學（64 tests passed），沿用同樣「先 RED 後 GREEN」紀律。

## Out of Scope

- WYSIWYG 行內所見即所得編輯（僅分屏即時預覽）。
- 協同編輯、雲端同步、帳號系統。
- 行動版（iOS/Android）。
- 數學公式（KaTeX）、Mermaid 圖、外掛系統（v2 候選）。
- 圖片貼上/拖曳嵌入與資源管理（v2 候選）。
- 多檔分頁（v1 單檔工作區；v2 候選）。

## Further Notes

- 執行檔體積目標：安裝後 ≤ 15MB；任何會推爆體積的依賴（如 headless browser）一律拒收。
- 平台支援：Windows 10/11 x64、Linux x64（deb + AppImage）、macOS 12+（Apple Silicon 先行）。
- UI 語言繁體中文優先，字串集中管理預留 i18n。
- 協作模式：Hermes 編排 + Codex/pi 多平行 sub-agent（各自 worktree），TDD gate + 交付前自我測試 + L1–L5 驗證。