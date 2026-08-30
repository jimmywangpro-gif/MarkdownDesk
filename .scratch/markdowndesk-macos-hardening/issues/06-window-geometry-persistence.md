# 06 — macOS window geometry persistence

**Priority:** P1

**What to build:** 使用者關閉並重新啟動 MarkdownDesk 後，視窗會恢復上次的尺寸、位置與 maximized 狀態；無效位置不會讓視窗消失在螢幕外。

**Blocked by:** 04 — 使用已驗證的 settings persistence integrity。

**Status:** completed — code-level verified；packaged close/relaunch multi-monitor smoke仍屬 UNVERIFIED。

- [ ] 首次啟動使用安全的預設尺寸
- [ ] resize 後保存新尺寸
- [ ] move 後保存新位置
- [ ] maximized 狀態可保存與恢復
- [ ] 無效、負值或螢幕外位置會安全回到可見範圍
- [ ] 關閉與 app quit 的保存時機明確
- [ ] settings 載入失敗時仍能以預設尺寸啟動
- [ ] packaged macOS app 完成關閉→重新啟動 smoke
- [ ] Rust / frontend tests 覆蓋首次啟動、恢復與 invalid state
