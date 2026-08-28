# 06 — 匯出 PDF

**What to build:** 預覽窗格走 webview 原生列印（print-to-PDF），叫起系統 PDF 對話框；列印樣式與螢幕主題脫鉤（白底黑字、分頁合理）。不引入 headless browser（體積紅線）。

**Blocked by:** 03。

**Status:** ready-for-agent

- [ ] macOS 實測列印對話框叫起且輸出 PDF 內容正確
- [ ] 列印樣式與螢幕主題脫鉤
- [ ] 新增依賴為零（用 webview 原生能力）