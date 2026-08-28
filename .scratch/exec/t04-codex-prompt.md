[Stream T04 — 檔案整合垂直切片]
執行者：Codex agent（deepseek-v4-flash:0731-cloud, ollama 通道）
worktree：/tmp/markdowndesk-t04（分支 feat/t04-file-integration）

[Scope boundary]
Implement/modify ONLY:
- src-tauri/src/commands.rs（新建：open_file/save_file/save_file_as 對話框+I/O、recent_files 讀寫、watch 檔案變更）
- src-tauri/src/lib.rs（僅 append：mod commands; 與 generate_handler! 註冊；不得刪改既有內容）
- src-tauri/Cargo.toml（僅允許新增：tauri-plugin-dialog, tauri-plugin-fs, notify）
- src/lib/fileOps.ts（新建：前端 invoke 包裝）
- src/App.tsx（僅 append 整合：開啟/儲存/最近檔/dirty guard/外部重載，禁重寫既有分屏結構）
Do NOT modify: src/lib/renderMarkdown.ts、測試檔、tauri.conf.json、capabilities。

[Pre-work — read-first]
- src-tauri/src/lib.rs（現有 handler 註冊方式）
- src/App.tsx（現有分屏結構與 state）
- src-tauri/capabilities/（現有權限）

[Task]
1. Rust commands：open_file（dialog→讀檔→回 path+content+mtime）、save_file(path,content)→回新 mtime、recent_files_list/add/clear（JSON 存 app data）、notify watcher（檔案被外部修改→emit file-changed 事件）。
2. 前端 fileOps.ts 包裝 invoke + event listen；App.tsx 整合：Cmd/Ctrl+S 儲存（無路徑→另存）、dirty guard（關閉/開新檔攔截）、外部修改提示重載、最近檔選單。
3. Rust #[test] + 暫存目錄真實 I/O 測試（開/存/最近檔/偵測邏輯），先 RED 後 GREEN。
4. capabilities 依 plugin 需求最小化新增（tauri.conf.json/capabilities 若必須動，僅 append 權限項並在回報中說明）。

[Acceptance criteria]
- 開啟/儲存/另存/最近檔/dirty guard/外部修改偵測全可用
- Rust tests 全綠；npm test 不回歸；npm run build 通過
- lib.rs 僅 append、無覆蓋既有註冊

[Test commands]
cargo test --manifest-path src-tauri/Cargo.toml
npm test && npm run build

[SELF-TEST gate]
全部跑過確認綠才交付；無法執行標 UNVERIFIED。

[Commit]
feat(t04): file integration vertical slice (open/save/recent/dirty-guard/watch)