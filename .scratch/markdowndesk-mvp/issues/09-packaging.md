# 09 — 三平台打包 + 體積驗收

**What to build:** 產出 macOS dmg（本機完整冒煙：安裝→啟動→開檔→渲染）、Windows NSIS、Linux deb + AppImage；量測安裝後體積 ≤ 15MB 預算；Windows/Linux 產物標記「需目標平台驗證」。

**Blocked by:** 02, 03, 04, 05, 06, 07, 08。

**Status:** ready-for-agent

- [ ] 三平台（四格式）安裝包產出
- [ ] 安裝後體積量測紀錄 ≤ 15MB
- [ ] macOS 冒煙全通過；Windows/Linux 標記待驗
- [ ] 打包腳本可重跑（單指令）