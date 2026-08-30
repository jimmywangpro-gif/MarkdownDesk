# 01 — 確認 editor 技術契約

**Priority:** P1 decision gate

**What to build:** 明確決定 MarkdownDesk v1 的 editor 採用原生 textarea 或 CodeMirror 6，並讓產品規格、依賴與實際 editor 行為一致，避免後續 workspace 修復建立在矛盾契約上。

**Blocked by:** None — can start immediately.

**Status:** completed — 使用者已決定採用 CodeMirror 6；migration 已合併 main 並通過 L5。

- [ ] 明確記錄 editor 選擇與理由
- [ ] SPEC 與實際 dependency / editor implementation 一致
- [ ] 若維持 textarea，確認目前 editor 行為足以支援 v1，並記錄限制
- [ ] 若 CodeMirror 6 仍是必要條件，另建立獨立實作票，不把 migration 混入 workspace layout 修復
- [ ] 決策完成後，後續 workspace ticket 使用同一份 editor 契約
