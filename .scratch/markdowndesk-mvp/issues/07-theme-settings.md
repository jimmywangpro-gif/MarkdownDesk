# 07 — 主題 + 設定持久化

**What to build:** 亮/暗主題（CSS custom properties 兩套 token）、編輯器/預覽字級設定、視窗大小位置記憶，全部存於 app data JSON 並跨啟動保留。App shell 與樣式 token 為共享檔案 — 只 append。

**Blocked by:** 01。

**Status:** ready-for-agent

**執行者（已裁示）：pi agent（deepseek-v4-flash:0731-cloud, --thinking xhigh）**

- [ ] 亮/暗切換即時生效且覆蓋編輯器+預覽
- [ ] 字級調整即時生效
- [ ] 設定 JSON 跨啟動保留（重啟驗證）
- [ ] 視窗大小/位置重啟後還原