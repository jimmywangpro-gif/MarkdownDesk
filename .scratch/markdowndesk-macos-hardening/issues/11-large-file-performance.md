# 11 — 大型檔案與 renderer performance guardrails

**Priority:** P2

**What to build:** 大型 Markdown 不會無限制佔用記憶體或讓 macOS WebView 長時間失去回應。

**Blocked by:** 08 — 先穩定 renderer / export 的功能契約，再量測效能。

**Status:** partial — 8 MiB UTF-8 guard與保留狀態已驗證；benchmark、memory profile與arm64 GUI smoke仍待完成。

- [ ] 定義可接受的 Markdown 檔案大小上限或警告門檻
- [ ] 超過門檻時有可理解的提示
- [ ] rendering / highlighting 在大型輸入上有可量測基線
- [ ] 不因單次輸入造成無限制 render queue 或重複 render
- [ ] 建立大型 fixture 的時間、記憶體與 WebView responsiveness 基線
- [ ] 既有 debounce 行為不被破壞
- [ ] macOS arm64 本機完成大型檔案 smoke
