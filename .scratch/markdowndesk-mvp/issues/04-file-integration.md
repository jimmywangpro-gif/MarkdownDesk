# 04 — 檔案整合垂直切片

**What to build:** 原生開啟/儲存/另存為（無路徑時 Save As）、最近檔案清單、未存變更 dirty guard（關閉/開新檔前攔截）、外部修改偵測與重載提示。Rust 端以 Tauri command 實作（notify crate 監看），`#[test]` + 暫存目錄真實 I/O 驗證。Rust command 註冊為共享檔案 — 只 append。

**Blocked by:** 01。

**Status:** ready-for-agent

**執行者（已裁示）：Codex agent（ollama 通道, deepseek-v4-flash:0731-cloud, 明確指定 model）**

- [ ] 開啟/儲存/另存全流程 macOS 實測通過
- [ ] 最近檔案持久化並可點選回開
- [ ] dirty guard：未存變更時關閉/開新檔出現確認對話
- [ ] 外部修改偵測：檔案被外部改動後 UI 提示重載
- [ ] Rust command tests 全綠（暫存目錄 I/O）