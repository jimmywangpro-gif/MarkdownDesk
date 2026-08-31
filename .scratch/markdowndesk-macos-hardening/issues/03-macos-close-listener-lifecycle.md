# 03 — macOS native close guard 與 listener lifecycle

**Priority:** P0

**What to build:** macOS 使用者關閉視窗、使用 `⌘W` 或觸發 app quit 時，dirty document 不會被靜默丟棄；Tauri event listener 在 mount、unmount、重新註冊與 React StrictMode 下不會重複處理。

**Blocked by:** None — can start immediately. 執行上建議與 02 使用同一 owner 順序完成。

**Status:** completed — code-level verified；dirty-close confirmation 已改用 Tauri native async dialog，macOS packaged red-dot GUI smoke 仍屬 UNVERIFIED（本機 Accessibility 不可用）。

- [x] clean document 可直接關閉
- [x] dirty document 關閉時出現 Tauri native async 確認
- [x] 使用者取消後視窗保持開啟
- [x] 使用者確認後才允許關閉
- [x] 使用 Tauri native close event，而不只依賴 `beforeunload`
- [ ] cold-start 與 warm-start open event 各只處理一次
- [ ] listener registration Promise 延遲時，cleanup 仍能解除 listener
- [ ] React StrictMode mount/unmount/re-mount 不會產生重複 listener
- [ ] macOS packaged app 完成 red-dot clean/dirty close smoke（本機 Accessibility `-1719`，需使用者手動確認）

## 2026-08-31 close regression follow-up

- macOS unified log 在紅點操作時記錄 `windowShouldClose: prevented close`；問題不是單純 application process 未退出。
- `useWindowState.ts` 原本以 browser `window.confirm()` 判斷 dirty close；packaged WebKit 下確認流程沒有形成可用的 native dialog path，導致 close request 反覆被 prevent。
- 已改用 `@tauri-apps/plugin-dialog` 的 async `confirm()`，並在 `src-tauri/capabilities/default.json` 加入 `dialog:allow-confirm`；dialog error 也 fail-closed 並 prevent close。
- accepted clean/dirty close 仍使用最新 geometry 發起 best-effort persistence，且不等待 `save_settings` IPC。
- TDD / verification：native confirm true/false、clean/dirty pending save cases 與 listener lifecycle tests 通過；完整 frontend 164 tests、Rust 41 tests、lint/build/clippy 通過。
- 真正點擊 packaged app 紅色 close button 的自動化嘗試受本機 Accessibility 限制，System Events 回 `-1719`，因此 red-dot GUI smoke 維持 `UNVERIFIED`。標準 application quit cleanup 可成功退出，不能替代紅點證據。
