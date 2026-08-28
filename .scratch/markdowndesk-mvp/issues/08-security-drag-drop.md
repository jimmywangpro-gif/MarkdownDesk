# 08 — 安全強化 + 拖放開檔

**What to build:** `.md` 拖曳至視窗即開啟（含 dirty guard）；預覽外部連結一律導向系統瀏覽器（攔截 webview 導航）；Tauri CSP 鎖至最小必要範圍；webview 內禁任何遠端載入。

**Blocked by:** 02, 04。

**Status:** ready-for-agent

- [ ] 拖放開檔含 dirty guard 攔截
- [ ] 外部連結全部開在系統瀏覽器，webview 不導航
- [ ] CSP 設定審查通過（無 `unsafe-eval`、無遠端 origin）
- [ ] 惡意文件（script/事件屬性/外部 iframe）開啟測試全數無害化