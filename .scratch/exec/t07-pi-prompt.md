[Stream T07 — 主題 + 設定持久化]
執行者：pi agent（deepseek-v4-flash:0731-cloud, --thinking max）
worktree：/tmp/markdowndesk-t07（分支 feat/t07-theme-settings）

[Scope boundary]
Implement/modify ONLY:
- src/theme.css（新建：light/dark 兩套 CSS custom properties token）
- src/App.css（僅 append：改用 var(--token) 引用；不得刪除既有規則）
- src/lib/settings.ts（新建：設定 load/save，JSON 存 app data）
- src/lib/SettingsContext.tsx（新建：Provider + useSettings hook）
- src/main.tsx（僅 append Provider 包裹）
- src/App.tsx（僅 append：工具列 append 主題切換/字級控制；禁改分屏與渲染邏輯）
- src-tauri/src/lib.rs（僅 append：load_settings/save_settings command 註冊）
Do NOT modify: renderMarkdown.ts、fileOps、測試檔。

[Pre-work — read-first]
- src/App.tsx（現有結構）
- src-tauri/src/lib.rs（現有註冊）
- src/index.css / App.css（現有樣式）

[Task]
1. theme.css：--bg/--fg/--accent/--border/--card 等 token，light/dark 兩套（data-theme 屬性切換）。
2. settings.ts：{theme: 'light'|'dark', editorFontSize: number, previewFontSize: number, windowState}，經 Rust command 存 app data JSON。
3. Rust load_settings/save_settings commands + 暫存目錄 #[test]（先 RED 後 GREEN）。
4. SettingsContext + App 整合：主題即時切換、字級即時生效、啟動時載入。
5. 元件測試：主題切換/字級變更/持久化（vitest + testing-library），先 RED 後 GREEN。

[Acceptance criteria]
- 主題切換即時覆蓋編輯+預覽
- 字級調整即時生效
- 設定跨啟動保留（Rust 暫存測試驗證 JSON round-trip）
- 既有測試不回歸；npm run build 通過

[Test commands]
npm test && npm run build
cargo test --manifest-path src-tauri/Cargo.toml

[SELF-TEST gate]
全綠才交付；無法執行標 UNVERIFIED。

[Commit]
feat(t07): theme tokens + settings persistence