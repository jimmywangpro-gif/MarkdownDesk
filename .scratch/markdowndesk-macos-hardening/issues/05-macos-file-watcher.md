# 05 — macOS 外部修改 watcher 可靠性

**Priority:** P0

**What to build:** 外部編輯器以一般寫入、atomic replacement、rename 或 remove/create 修改 Markdown 時，MarkdownDesk 能可靠偵測並只提示一次 reload。

**Blocked by:** 02 — 安全儲存先定義共用的檔案版本與 conflict 契約。

**Status:** completed — code-level verified；macOS packaged GUI watcher smoke仍屬 UNVERIFIED。

- [ ] 支援 macOS 常見 atomic replacement 流程
- [ ] 同一次儲存的多個 filesystem events 會被 debounce / coalesce
- [ ] 版本判斷不只依賴毫秒 mtime
- [ ] 開啟新檔案前會釋放舊檔案 watcher
- [ ] 檔案刪除、重新建立、權限改變都有明確結果
- [ ] canonical path 與 filesystem event path 能以一致 identity 比對
- [ ] 外部修改時 dirty document 不會被靜默覆寫
- [ ] Rust regression tests 覆蓋 simple write、atomic replacement 與 event burst
- [ ] macOS packaged app 完成外部修改 smoke
