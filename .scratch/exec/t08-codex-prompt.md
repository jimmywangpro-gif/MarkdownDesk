[Stream T08 — 安全強化 + 拖放開檔]
執行者：Codex agent（gpt-5.6-luna, openai-codex, reasoning xhigh）
worktree：/tmp/markdowndesk-t08（分支 feat/t08-security-dnd，自 main 建立）

[Scope boundary]
Implement/modify ONLY:
- src-tauri/tauri.conf.json（僅 security.csp 與最小必要調整；bundle/windows 不得動）
- src-tauri/capabilities/（僅 append 最小必要權限）
- src/dnd.ts（新建：拖放開檔處理）
- src/dnd.test.ts（新建：先 RED 後 GREEN）
- src/previewLinks.ts（新建：外部連結攔截導系統瀏覽器）
- src/previewLinks.test.ts（新建）
Do NOT modify: src/App.tsx、renderMarkdown.ts、既有測試檔、檔案整合核心邏輯、主題/設定。
T09 將在所有 feature modules 合併後統一把 dnd/previewLinks seams 接到 App；本票不要自行修改共享 UI。

[Pre-work — read-first]
- src-tauri/tauri.conf.json 與 capabilities/（現況）
- src/lib/fileOps.ts（既有開檔 API）
- src/App.tsx（整合點）

[Task]
1. dnd：提供可由 App 呼叫的拖放事件處理 seam：判定 `.md` 檔、非 `.md` 忽略並回傳可顯示的結果；dirty guard 由 callback/參數注入，既有 fileOps 的開檔呼叫由 T09 整合。
2. 外部連結：預覽區連結點擊攔截 — http(s)/mailto 開系統瀏覽器（tauri opener plugin 或 shell），webview 本身不導航；文件內部錨點不攔截。
3. CSP 鎖定：tauri.conf.json security.csp 設最小必要（default-src 'self'；style-src 'self' 'unsafe-inline' 若高亮樣式需要；禁 remote origin、禁 unsafe-eval；img-src 限 data: 與 asset 協議若有需要）。
4. capabilities 最小化：僅放行已用 plugin 權限，移除/不新增多餘權限。
5. 測試：dnd（mock DataTransfer 驗證 .md 判別與 dirty 攔截）、previewLinks（mock 驗證外部開啟呼叫與 webview 不導航）、既有測試不回歸。先 RED 後 GREEN。

[Acceptance criteria]
- 拖放開檔含 dirty guard；非 .md 忽略
- 外部連結全開系統瀏覽器、webview 不導航
- CSP 無 unsafe-eval、無遠端 origin
- 既有測試全綠；npm test + build + cargo test 通過

[Test commands]
npm test && npm run build
cargo test --manifest-path src-tauri/Cargo.toml

[SELF-TEST gate]
全綠才交付；無法執行標 UNVERIFIED。

[Commit]
feat(t08): drag-and-drop open + external link interception + CSP hardening