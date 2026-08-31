# 12 — macOS signed、notarized release gate

**Priority:** P0 release gate

**What to build:** 未來若要公開散布，產出的 macOS DMG 可由一般 macOS 使用者下載、安裝、通過 Gatekeeper 並啟動；Markdown file association 與首次啟動流程可用。

**Blocked by:** 02、03、04、05、06、07、08、09、10。

**Status:** deferred — MarkdownDesk 目前定位為本機自用；已驗證的 unsigned `npm run package` 是目前交付路徑。release command contract、stable bundle identifier 與 fail-closed signing/notarization checks 保留，供未來公開散布時啟用。

- [x] 穩定 bundle identifier：`io.github.jimmywangpro-gif.markdowndesk`
- [x] `package:macos:release` 僅允許 Darwin，並要求 `APPLE_SIGNING_IDENTITY` 與 `MACOS_NOTARY_PROFILE`
- [x] 缺少 release 設定時 fail-closed；release dry-run 明示 `UNVERIFIED` 且不產生 artifact
- [x] release policy 依序宣告 codesign、notarytool、stapler、app executable 與 DMG Gatekeeper assessment；無 credential 時未宣稱已執行
- [ ] 使用 Developer ID signing
- [ ] app resource sealing 完整
- [ ] notarization 成功
- [ ] stapling 完成
- [ ] `codesign --verify --deep --strict` 成功
- [ ] `spctl --assess --type execute` 成功
- [x] 從實際 unsigned DMG 安裝至 Applications 後可啟動並乾淨退出（自用 smoke）
- [ ] quarantine / 網路下載情境完成 smoke
- [ ] Finder 雙擊 `.md` / `.markdown` 能開啟 MarkdownDesk
- [ ] DMG 安裝導引符合 macOS 慣例
- [ ] signing / notarization secrets 不進 repository
- [ ] release evidence 與 package-file size evidence 分開記錄

## 2026-08-30 contract evidence

- TDD：identifier / missing release setting / release dry-run contract 先以 11 passed、3 failed 確認 RED；補上 application executable assessment policy 後以 14 passed、1 failed 確認 RED；最終 `npm run packaging:test` 為 15 passed。
- `npm run package` 仍明確傳遞 `--no-sign`，且實際產生 unsigned arm64 DMG；release path 才省略 `--no-sign`。
- 已讀回新 bundle 的 `CFBundleIdentifier`，並以 `hdiutil verify` 驗證實際 DMG checksum。
- 已掛載實際 DMG，僅替換 `/Applications/MarkdownDesk.app`（保留使用者資料）；讀回 identifier、version 與 arm64 executable 後，`open -a` process launch 與標準 quit event 都通過。
- Keychain 現況僅有 Apple Development identity，沒有 Developer ID Application；本輪未提供或驗證 intended `notarytool` Keychain profile。因此簽章、公證、stapling、`spctl` 的真實成功結果與 install/quarantine/Finder smoke 均未驗證。

> 11 是 P2，不是目前 release gate 的必要 blocker；除非產品另行決定把大型檔案效能納入 release acceptance。
