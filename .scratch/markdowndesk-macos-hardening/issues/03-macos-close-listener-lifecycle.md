# 03 — macOS native close guard 與 listener lifecycle

**Priority:** P0

**What to build:** macOS 使用者關閉視窗、使用 `⌘W` 或觸發 app quit 時，dirty document 不會被靜默丟棄；Tauri event listener 在 mount、unmount、重新註冊與 React StrictMode 下不會重複處理。

**Blocked by:** None — can start immediately. 執行上建議與 02 使用同一 owner 順序完成。

**Status:** completed — code-level verified；macOS packaged native close smoke仍屬 UNVERIFIED。

- [ ] clean document 可直接關閉
- [ ] dirty document 關閉時出現確認
- [ ] 使用者取消後視窗保持開啟
- [ ] 使用者確認後才允許關閉
- [ ] 使用 Tauri native close event，而不只依賴 `beforeunload`
- [ ] cold-start 與 warm-start open event 各只處理一次
- [ ] listener registration Promise 延遲時，cleanup 仍能解除 listener
- [ ] React StrictMode mount/unmount/re-mount 不會產生重複 listener
- [ ] macOS packaged app 完成 clean/dirty close smoke
