# 03 — 分屏佈局 + 模式切換 + 同步捲動

**What to build:** 編輯/檢視/分屏三模式切換（含快捷鍵）；分屏時預覽隨編輯游標所在區塊錨定捲動；輸入 debounce ~150ms 後重渲染。App shell 為共享檔案 — 只 append，禁改他人範圍。

**Blocked by:** 01, 02。

**Status:** ready-for-agent

- [ ] 三模式切換正確且快捷鍵可用
- [ ] 長文件中游標移動，預覽錨定對應區塊（區塊級，非像素級）
- [ ] debounce 生效：連續輸入不逐鍵重渲染
- [ ] 元件互動測試（vitest + testing-library）涵蓋模式切換與 dirty 提示