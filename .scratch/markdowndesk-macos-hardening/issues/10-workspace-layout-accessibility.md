# 10 — workspace layout、accessibility 與 responsive behavior

**Priority:** P1

**What to build:** editor/preview 實際尺寸符合使用者拖曳或鍵盤調整的 ratio，且 macOS 窄視窗與輔助技術仍可操作。

**Blocked by:** 01 — 先確定 editor 技術契約，再決定 workspace layout 的實作與測試面。

**Status:** partial — CSS ratio/ARIA/narrow toolbar contract已驗證；packaged WebView實際尺寸與keyboard smoke仍屬 UNVERIFIED。

- [ ] 實際 pane pixel width 符合 ratio，不只驗 inline `flexBasis`
- [ ] divider drag、ArrowLeft、ArrowRight 與 window resize 行為一致
- [ ] 不依賴兩個 pane 的未控制 `flex-grow`
- [ ] separator 暴露目前值、最小值與最大值
- [ ] editor 有可辨識的 accessible name
- [ ] toolbar 在窄視窗不會裁切主要操作
- [ ] 窗口縮放後 editor、preview、divider 仍可操作
- [ ] packaged macOS WebView 完成實際 layout smoke
- [ ] keyboard navigation 與 accessibility tests 通過
