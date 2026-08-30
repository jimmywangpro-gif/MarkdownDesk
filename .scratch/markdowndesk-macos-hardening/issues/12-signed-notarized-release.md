# 12 — macOS signed、notarized release gate

**Priority:** P0 release gate

**What to build:** 產出的 macOS DMG 可由一般 macOS 使用者下載、安裝、通過 Gatekeeper 並啟動；Markdown file association 與首次啟動流程可用。

**Blocked by:** 02、03、04、05、06、07、08、09、10。

**Status:** blocked — 需要 Developer ID signing / notarization credentials與macOS release environment。

- [ ] 使用 Developer ID signing
- [ ] app resource sealing 完整
- [ ] notarization 成功
- [ ] stapling 完成
- [ ] `codesign --verify --deep --strict` 成功
- [ ] `spctl --assess --type execute` 成功
- [ ] 從實際 DMG 安裝至 Applications 後可啟動
- [ ] quarantine / 網路下載情境完成 smoke
- [ ] Finder 雙擊 `.md` / `.markdown` 能開啟 MarkdownDesk
- [ ] DMG 安裝導引符合 macOS 慣例
- [ ] signing / notarization secrets 不進 repository
- [ ] release evidence 與 package-file size evidence 分開記錄

> 11 是 P2，不是目前 release gate 的必要 blocker；除非產品另行決定把大型檔案效能納入 release acceptance。
