[Stream T05 — 匯出 HTML]
執行者：pi agent（gpt-5.6-luna, openai-codex, --thinking xhigh）
worktree：/tmp/markdowndesk-t05（分支 feat/t05-export-html，自 main 建立，含 T02/T03）

[Scope boundary]
Implement/modify ONLY:
- src/lib/exportHtml.ts（新建：renderMarkdown(source) → 完整獨立 HTML 文件字串）
- src/lib/exportHtml.test.ts（新建：golden tests，先 RED 後 GREEN）
- src/App.tsx（僅 append：工具列「匯出 HTML」按鈕 + 呼叫）
- src-tauri/src/lib.rs（僅 append：export_html_save_dialog/save_text_file command 註冊，若需 Rust 端對話框）
- src-tauri/Cargo.toml（僅允許新增 tauri-plugin-dialog 若尚未存在）
Do NOT modify: renderMarkdown.ts、檔案整合（fileOps）、主題/設定、既有測試。

[Pre-work — read-first]
- src/lib/renderMarkdown.ts（T02 後的 unified 管線，輸出已 sanitize 的 HTML fragment）
- src/App.tsx（工具列現況）
- src-tauri/src/lib.rs（command 註冊方式）

[Task]
1. exportHtml.ts：以 renderMarkdown 產出 body 片段 → 包裝為完整 HTML 文件（<!DOCTYPE html>、meta charset、內嵌 <style> 樣式含 code 高亮配色、標題取自文件首個 h1 或檔名）。輸出必須自足：離線瀏覽器開啟即與預覽一致。
2. 匯出流程：前端按鈕 → Rust save dialog → 寫檔 → 成功/取消/寫入失敗三路徑（取消靜默、失敗顯示錯誤、成功提示）。
3. Rust #[test]：暫存目錄寫檔 round-trip + dialog command 存在性；前端 golden tests：文件結構完整（doctype/charset/style 內嵌/script 為零）、sanitize 貫穿（exportHtml 不得繞過 renderMarkdown 的 sanitize）。
4. 先 RED 後 GREEN。

[Acceptance criteria]
- 匯出檔離線可開且渲染與預覽一致（golden 驗證結構）
- 三路徑處理正確
- 既有測試全綠；npm run build 通過；cargo test 全綠

[Test commands]
npm test && npm run build
cargo test --manifest-path src-tauri/Cargo.toml

[SELF-TEST gate]
全綠才交付；無法執行標 UNVERIFIED。

[Commit]
feat(t05): standalone HTML export with inline styles