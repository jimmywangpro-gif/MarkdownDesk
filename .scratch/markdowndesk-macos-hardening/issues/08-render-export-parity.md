# 08 — preview、HTML export 與 print render contract 一致

**Priority:** P1

**What to build:** 同一份 Markdown 在 preview、standalone HTML 與 PDF print 中，保有一致的 sanitize、table layout、alignment、code highlight 與基本樣式。

**Blocked by:** None — can start immediately.

**Status:** completed — code-level verified；packaged WebView CSP/print GUI smoke仍屬 UNVERIFIED。

- [ ] preview 與 HTML export 的 table wrapper 行為一致
- [ ] GFM left/right/center alignment 在 export 中保留
- [ ] code highlight markup 與樣式契約一致
- [ ] export 仍維持 sanitize 與嚴格 CSP
- [ ] packaged WebView 實際確認 CSP 與 layout 可運作
- [ ] print 不會把不必要的 app toolbar/title chrome 印進文件
- [ ] HTML export 可離線開啟且不依賴外部 stylesheet/script
- [ ] renderer、export、print golden/integration tests 覆蓋上述行為

> 不得為了排除未證實的 CSP 疑慮而直接加入 `unsafe-inline` 或 `unsafe-eval`。
