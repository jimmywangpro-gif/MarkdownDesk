# 09 — GFM task list interactive behavior

**Priority:** P1

**What to build:** 使用者可以在 preview 點擊 GFM task checkbox，狀態會回寫 Markdown、標記 dirty，並可正常儲存。

**Blocked by:** 02 — task interaction 必須使用已定義的 dirty / safe-save semantics。

**Status:** completed — preview task互動、source回寫與dirty state已驗證；native reopen GUI smoke仍屬 UNVERIFIED。

- [ ] `- [ ]` 與 `- [x]` 正確顯示狀態
- [ ] checkbox 可互動，不再固定為 disabled-only presentation
- [ ] 點擊後 source 內容同步更新
- [ ] 點擊後 dirty state 正確更新
- [ ] 外部修改或重新 render 後 checkbox 狀態不錯亂
- [ ] 儲存後重新開啟仍保留新狀態
- [ ] nested task list 與多個 task item 有明確 mapping
- [ ] renderer golden 與 React integration tests 全部通過
