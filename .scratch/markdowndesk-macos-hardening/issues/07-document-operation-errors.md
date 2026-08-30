# 07 — 統一檔案操作錯誤與 recent consistency

**Priority:** P1

**What to build:** open、save、drop、file association、recent file、watcher 失敗時，都會顯示清楚結果；最近檔案列表與實際 persistence 保持一致。

**Blocked by:** 02、05 — 使用安全儲存的結果契約與可靠 watcher 的檔案狀態。

**Status:** partial — 主要 open/save/drop/association/recent error path已整合；每個 native dialog path 的實機驗證仍待完成。

- [ ] open/read/write/drop/association/recent failure 不再形成未處理 rejection
- [ ] 檔案不存在、無權限、無效內容與取消操作能區分
- [ ] 使用者可看到操作失敗原因
- [ ] drag/drop 或 association 開檔後 recent list 即時更新
- [ ] 開啟不存在的 recent file 不會讓 UI 卡住或清空其他狀態
- [ ] save failure 後 dirty state 與目前 source 保持正確
- [ ] watcher read failure 有明確提示或 recovery path
- [ ] 每條 document operation path 都有 success / error / cancelled test
- [ ] `npm test`、`npm run build`、Rust tests 全部通過
