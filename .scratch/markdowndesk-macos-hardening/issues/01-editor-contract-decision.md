# 01 — 確認 editor 技術契約

**Priority:** P1 decision gate

**What to build:** 明確決定 MarkdownDesk v1 的 editor 採用原生 textarea 或 CodeMirror 6，並讓產品規格、依賴與實際 editor 行為一致，避免後續 workspace 修復建立在矛盾契約上。

**Blocked by:** None — can start immediately.

**Status:** completed — 初次決策採用 CodeMirror 6，但 packaged macOS WebKit 實測出現「preview 已載入、editor 空白且顯示 gutter」regression。使用者於 2026-08-30 依穩定性優先原則改裁示 v1 採受控原生 textarea；CodeMirror dependency、implementation 與專屬 tests 已撤回。

- [x] 明確記錄 editor 選擇與理由
- [x] SPEC 與實際 dependency / editor implementation 一致
- [x] 維持 textarea；native file-open contract 與 textarea `.value` / preview 同步已有 regression tests
- [x] CodeMirror 如未來重新評估，必須獨立處理 macOS WebKit runtime verification，不得混入 workspace layout 修復
- [x] 後續 workspace ticket 使用 textarea editor 契約
