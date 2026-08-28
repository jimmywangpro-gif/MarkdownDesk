# PITFALLS — MarkdownDesk

> 踩坑紀錄；每條註明日期與影響面。事實紀錄（誰做了什麼）請寫 docs/exec/。

## 建置/環境

- （待補）

## 協作流程

- 2026-08-28：`npm create tauri-app` 等連網指令在 Hermes terminal 需使用者批准；被擋時不可重試同指令，先走 clarify 取得同意。（影響：scaffold 類操作）
- 2026-08-28：Codex ollama 模式啟動會刷「Model metadata for deepseek-v4-flash:0731-cloud not found. Defaulting to fallback metadata」— 非致命警告，不影響執行，忽略即可。（影響：所有 codex --oss 派工）
- 2026-08-28：Codex ollama 長任務尾端可能連線中斷（`invalid reasoning value "xhigh"` + Reconnecting 5 次）exit 1，但程式碼已寫畢 — 先 commit 部分成果再檢查，常可救回完整交付。（影響：codex ollama 派工）
- 2026-08-28：合併衝突後若只跑 vitest，殘留衝突標記可能漏抓（測試檔編譯失敗會被靜默跳過）；**合併後必跑 `npm run build`（tsc）才算 L5 過**。（影響：所有合併驗證）
- 2026-08-28：並行分支同時 append 同檔（App.css/App.tsx/lib.rs）必生衝突；prompt 已聲明 append-only 可降低但不能消除，合併順序 + Hermes 手工融合是必要工序。（影響：所有 W2+ 併行合併）