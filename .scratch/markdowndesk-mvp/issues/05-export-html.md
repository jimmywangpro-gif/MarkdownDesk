# 05 — 匯出 HTML

**What to build:** 一鍵將當前文件匯出為獨立樣式 HTML 檔（內嵌 CSS、無外部依賴、瀏覽器直接可開），走原生儲存對話框。輸出必須經過與預覽相同的 sanitize 管線。

**Blocked by:** 02。

**Status:** ready-for-agent

- [ ] 匯出檔含完整樣式，瀏覽器離線可開且渲染一致
- [ ] 走 sanitize 管線（與預覽同一純函式）
- [ ] 匯出成功/取消/寫入失敗三路徑處理