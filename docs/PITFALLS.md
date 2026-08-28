# PITFALLS — MarkdownDesk

> 踩坑紀錄；每條註明日期與影響面。事實紀錄（誰做了什麼）請寫 docs/exec/。

## 建置/環境

- （待補）

## 協作流程

- 2026-08-28：`npm create tauri-app` 等連網指令在 Hermes terminal 需使用者批准；被擋時不可重試同指令，先走 clarify 取得同意。（影響：scaffold 類操作）
- 2026-08-28：Codex ollama 模式啟動會刷「Model metadata for deepseek-v4-flash:0731-cloud not found. Defaulting to fallback metadata」— 非致命警告，不影響執行，忽略即可。（影響：所有 codex --oss 派工）