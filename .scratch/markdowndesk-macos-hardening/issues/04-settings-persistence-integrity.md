# 04 — settings persistence integrity

**Priority:** P1

**What to build:** 設定檔損壞、值超出範圍或快速連續變更時，不會讓 theme、字級或後續 window state 失效。

**Blocked by:** None — can start immediately.

**Status:** partial — validation與serialized frontend save已完成；Rust settings JSON atomic write與可見 persistence failure仍待完成。

- [ ] `theme` 只接受明確允許值
- [ ] editor / preview font size 會被驗證並限制在合理範圍
- [ ] 損壞或不相容 JSON 有明確 fallback
- [ ] 連續快速設定不會以舊值覆蓋新值
- [ ] settings write 不會留下半份 JSON
- [ ] fallback 與 persistence failure 有可診斷結果，不以靜默成功掩蓋錯誤
- [ ] malformed、invalid-value、rapid-update tests 通過
- [ ] `npm test`、`npm run build`、Rust tests 全部通過
