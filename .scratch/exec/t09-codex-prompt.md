[Stream T09 — 三平台打包 + 體積驗收]
執行者：Codex agent（gpt-5.6-luna, openai-codex, reasoning xhigh）
worktree：/tmp/markdowndesk-t09（分支 feat/t09-packaging；必須自所有 T01–T08 已合併的最新 main 建立）

[Scope boundary]
Implement/modify ONLY:
- src-tauri/tauri.conf.json（bundle targets/必要 packaging 設定）
- package.json、package-lock.json（只新增可重跑的 packaging scripts）
- scripts/（新增打包/驗證腳本）
- .github/workflows/（新增跨平台 release/build workflow；若 repo 尚未使用 GitHub Actions，可建立最小 workflow）
- docs/packaging.md（打包與平台限制說明）
Do NOT modify src/**、src-tauri/src/**、既有測試、rendering/file/settings/security 功能。

[Pre-work — read-first]
- 讀取 docs/SPEC.md 與 issue 09。
- 讀取 src-tauri/tauri.conf.json、package.json、目前 OS/targets/toolchain。
- 先確認 Tauri CLI 的實際 `--bundles`/target 行為，不猜命令。

[Task]
1. 提供單一可重跑入口（package script 或 scripts/package.sh）：在 macOS 產生 dmg，在 Windows 產生 NSIS，在 Linux 產生 deb + AppImage；主機不支援的 bundle 必須明確失敗或標示 UNVERIFIED，不得假造產物。
2. 若 macOS 無法直接產生 Windows/Linux，加入 GitHub Actions matrix（macOS/Windows/Ubuntu）與 artifact upload，讓四種格式可在目標 runner 產出；不引入 Electron/headless browser。
3. 加入 package/size manifest 驗證，記錄實際檔案大小；≤15MB 只對已實際量測的安裝後/套件內容宣稱，無法量測則標 UNVERIFIED。
4. TDD/驗證先行：先建立可執行的 config/script validation（先 RED 再 GREEN），驗證 target mapping、script 重跑與 size guard；不要只寫文件。
5. 保留現有 frontend/Rust 功能，完成後執行既有全測試與可用的本機 packaging smoke test。

[Acceptance criteria]
- macOS 可重跑產出 dmg，或有完整、可執行的 macOS packaging evidence。
- Windows NSIS、Linux deb/AppImage 有目標 runner 或明確的 UNVERIFIED 證據；不可捏造已產出。
- package target mapping、artifact naming、size measurement 可程式化驗證。
- 無 headless browser/Electron 新增依賴；既有 npm test/build/cargo test 不回歸。

[Test commands]
npm test && npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build

[SELF-TEST gate]
交付前必須先執行上述測試與可用的打包命令；逐一回報實際結果與 UNVERIFIED 平台。無法驗證不得宣稱完成。

[Commit]
feat(t09): reproducible cross-platform packaging pipeline