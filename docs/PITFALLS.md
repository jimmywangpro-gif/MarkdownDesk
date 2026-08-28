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
- 2026-08-28：模型切換後，Codex/pi 必須在啟動命令同時明確指定 `gpt-5.6-luna` 與 `xhigh`；歷史 EOR 保留原實際模型，不能回填改寫。（影響：跨 session 派工可追溯性）
- 2026-08-28：T03 舊分支未含 T04，整合分屏功能前必須先合併最新 main；否則 App.tsx 會遺失檔案流程。共享 App.tsx 已改由後續整合票指定唯一 owner。（影響：T03+後續 feature waves）

## T10 文件/回歸

- 2026-08-28：新 worktree 可能沒有 `node_modules`；直接執行 `npm test` 會得到 `vitest: command not found`（exit 127）。先依 lockfile 執行 `npm ci`，再重跑測試；不要把環境失敗當成產品測試結果。（影響：回歸驗證）
- 2026-08-28：Tauri packaging 目前已有 macOS Darwin arm64 的實際 DMG package-file 證據（詳見 `docs/exec/t09.md`）；Windows/Linux runner、安裝/啟動與 installed footprint 仍必須在目標環境補證。
- 2026-08-28：SPEC 的 user story 若只有 schema 或 native command seam，不能推論成完整 GUI/平台驗收；acceptance matrix 必須把缺少的 dialog、install、launch 與 target-runner 結果標成 `PARTIAL` 或 `UNVERIFIED`。（影響：最終驗收文件）
