[Stream T06 — 匯出 PDF]
執行者：pi agent（gpt-5.6-luna, openai-codex, --thinking xhigh）
worktree：/tmp/markdowndesk-t06（分支 feat/t06-export-pdf，自 main 建立）

[Scope boundary]
Implement/modify ONLY:
- src/lib/printPdf.ts（新建：webview 原生列印觸發邏輯）
- src/lib/printPdf.test.ts（新建：先 RED 後 GREEN）
- src/App.tsx（僅 append：工具列「匯出 PDF」按鈕）
- src/print.css（新建：列印樣式 — 白底黑字、與螢幕主題脫鉤、分頁合理）
- index.html 或 main.tsx（僅 append print.css 引入，若採 link media=print 方式）
Do NOT modify: renderMarkdown.ts、exportHtml、檔案整合、主題/設定既有邏輯、src-tauri/**（webview 列印為前端能力，不需 Rust）。

[Pre-work — read-first]
- src/App.tsx（工具列現況與 T05 匯出按鈕並存）
- src/App.css（螢幕樣式，列印須覆蓋）

[Task]
1. printPdf.ts：window.print() 包裝 + 列印前確保預覽窗格可見（若當前模式為 edit，暫時切到含預覽的模式，列印後還原）。
2. print.css：@media print — 隱藏工具列/編輯器、預覽全寬、白底黑字（不隨 data-theme 變動）、code 區塊保留高亮但適配紙張、避免區塊內分頁斷裂（break-inside: avoid 對 table/pre/li 合理設定）、@page margin。
3. 測試：print.css 關鍵規則存在性（讀檔驗證）、printPdf 行為（mock window.print 驗證呼叫、模式還原邏輯）、既有測試不回歸。
4. 先 RED 後 GREEN。新依賴為零（webview 原生能力）。

[Acceptance criteria]
- 列印對話框叫起（macOS 實測由 Hermes 冒煙；執行者以 mock 測試驗證呼叫路徑）
- 列印樣式與螢幕主題脫鉤（白底黑字）
- 既有測試全綠；npm run build 通過

[Test commands]
npm test && npm run build

[SELF-TEST gate]
全綠才交付；無法執行標 UNVERIFIED。

[Commit]
feat(t06): print-to-PDF export with print stylesheet