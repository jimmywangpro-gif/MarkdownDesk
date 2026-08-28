# 01 — Scaffold + tracer bullet

**What to build:** Tauri v2 專案骨架落地：React+TS 前端含最小編輯文字框與預覽窗格，輸入文字即出現最小 Markdown 渲染（tracer bullet，打通前端→渲染→預覽全路徑）；macOS 本機可 `tauri dev` 建置啟動；vitest 與 Rust `#[test]` harness 就位，各含一支範例通過測試（CI 綠基線）。

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `npm run tauri dev` 於 macOS 啟動，視窗出現編輯/預覽雙窗格
- [ ] 輸入 `# Hello` 預覽即顯示 h1（最小管線打通）
- [ ] `npm test`（vitest）至少 1 綠；`cargo test`（src-tauri）至少 1 綠
- [ ] README 記錄本機建置指令
- [ ] 執行檔骨架不含未用依賴（體積紀律起點）