# 02 — 安全儲存與外部版本 conflict protection

**Priority:** P0

**What to build:** 使用者按下 `⌘S` 或完成 Save As 時，MarkdownDesk 不會無提示覆寫其他工具已修改的版本；儲存中斷也不會留下半個檔案。

**Blocked by:** None — can start immediately.

**Status:** completed — code-level verified；native Save As overwrite dialog仍屬 UNVERIFIED。

- [ ] 儲存前能辨識磁碟版本已不同，並拒絕靜默覆寫
- [ ] conflict 時保留 editor 內容與 dirty state
- [ ] 成功儲存使用可恢復的 atomic write 行為
- [ ] Save As 指向既有檔案時有明確覆寫策略
- [ ] 權限不足、read-only、disk full、conflict 都有可見結果
- [ ] Rust 暫存目錄測試覆蓋版本衝突與儲存完整性
- [ ] React integration test 覆蓋 save failure 後的 UI state
- [ ] `npm test`、`npm run build`、Rust tests 全部通過
