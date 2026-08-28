# MarkdownDesk SPEC acceptance matrix

- 規格：`docs/SPEC.md` v1.0
- 回歸票：T10
- 狀態定義：`PASS` 只表示列出的程式測試/接縫證據通過，不延伸成 GUI 或三平台實機通過；`PARTIAL` 表示只有部分行為或 native 接縫尚未驗證；`UNVERIFIED` 表示沒有足夠的可執行證據，或目標平台沒有執行證據。
- 測試基線：T10 在 Darwin arm64 執行 `npm test && npm run build`，Vitest **11 files / 59 tests passed**；執行 `cargo test --manifest-path src-tauri/Cargo.toml`，Rust **13 passed, 0 failed**。建置通過，但有既有 Vite chunk-size advisory。

## 22 user stories

| # | User story（SPEC 原意） | 狀態 | 實際測試／證據 | 平台或文件缺口 |
|---:|---|:---:|---|---|
| 1 | 從 native file dialog 開啟 `.md` 檔 | **PARTIAL** | `src-tauri/src/commands.rs` 的 `open_file` 實作與 `read_file_at_reads_content_and_mtime`、`read_file_at_missing_file_returns_error`；`docs/exec/t04.md`。 | `open_file` 的原生 dialog、實際選檔與 macOS/Windows/Linux GUI 未執行。 |
| 2 | 編輯器旁即時顯示 preview | **PASS** | `src/App.test.tsx`：`renders editor and preview panes`、`shows preview updating live while typing`；`src/App.t03.test.tsx`。 | 只有測試環境 UI 證據，沒有額外的目標平台 GUI smoke。 |
| 3 | preview 捲動跟隨 editor cursor | **PASS** | `src/App.t03.test.tsx`：`anchors preview scroll to the block under the editor caret`；同檔的 block mapping 測試。 | jsdom 以 `offsetTop` stub 驗證，未在實際 webview 長文件上驗證。 |
| 4 | 依 GFM 渲染 tables | **PASS** | `src/lib/renderMarkdown.test.ts`：`renders GFM tables with alignment` golden test。 | 無額外平台缺口；renderer golden 不等於原生安裝驗證。 |
| 5 | GFM task list 以可互動 checkbox 顯示 | **PARTIAL** | `src/lib/renderMarkdown.test.ts`：`renders GFM task lists with checkbox state`。 | 目前 golden 證據是帶 `disabled` 的 checked/unchecked checkbox；沒有 preview checkbox 互動或回寫 Markdown 的測試/實作證據。 |
| 6 | fenced code block syntax highlighting | **PASS** | `src/lib/renderMarkdown.test.ts`：`highlights fenced code blocks with hljs classes` 及 unlabeled code test。 | 未在三平台安裝包中做視覺 smoke。 |
| 7 | strikethrough 與 autolink | **PASS** | `src/lib/renderMarkdown.test.ts`：`renders GFM strikethrough`、`renders GFM autolinks (URL and email)`。 | 無額外平台缺口。 |
| 8 | Cmd/Ctrl+S；無 path 時走 Save As | **PARTIAL** | `src/App.tsx` 的 `handleSave`、快捷鍵 listener 與 `handleSaveAs`；`src-tauri/src/commands.rs` 的 `save_file`/`save_file_as`；`docs/exec/t04.md`。 | 沒有直接覆蓋快捷鍵與 native Save/Save As dialog 的前端測試；實際 dialog 未在目標平台執行。 |
| 9 | recent files list | **PARTIAL** | `src-tauri/src/commands.rs`：`recent_files_push_dedupes_and_caps`、`recent_files_clear_empties_list`、missing-file test；`src/App.tsx` recent select；`docs/exec/t04.md`。 | Rust data seam 有測試，但 list UI 選取、跨 launch 及原生 app data 目錄尚無整合/GUI 證據。 |
| 10 | 偵測外部修改並提供 reload | **PARTIAL** | `src-tauri/src/commands.rs`：`is_external_modify_filters_events`、`watcher_emits_on_external_write`；`src/App.tsx` 的 `file-changed` reload/confirm flow。 | 沒有 React integration test 覆蓋 confirm/reload；目標平台檔案監看實機未驗證。 |
| 11 | close/open 的 dirty-state guard | **PARTIAL** | `src/App.tsx` 的 open/recent/beforeunload guards；`src/dnd.test.ts` 的 `uses the injected dirty guard before opening`；`docs/exec/t04.md`、`docs/exec/t08.md`。 | 尚無直接測試 native close prompt、open prompt 的完整 UI 流程。 |
| 12 | view-only mode 隱藏 editor | **PASS** | `src/App.t03.test.tsx`：`switches to view-only mode via toolbar button` 與快捷鍵測試。 | 未在目標平台 GUI smoke；模式切換本身已由測試覆蓋。 |
| 13 | 匯出 standalone styled HTML | **PARTIAL** | `src/lib/exportHtml.test.ts` 的完整 HTML、title、style、sanitize 與 save/cancel/error tests；`src-tauri/src/lib.rs` 的 `save_text_file_round_trips_in_a_temp_directory`；`src/App.integration.test.tsx` 的 toolbar wiring；`docs/exec/t05.md`、`docs/packaging.md`、`docs/exec/t09.md`。 | native HTML save dialog 與安裝後瀏覽器開啟未實機執行。 |
| 14 | 匯出/列印 PDF | **PARTIAL** | `src/lib/printPdf.test.ts` 的 native `window.print`、edit mode restore、print CSS；`src/App.integration.test.tsx` 的 toolbar wiring；`docs/exec/t06.md`、`docs/packaging.md`。 | T06 已明確記錄 macOS native print dialog/PDF 及 Windows/Linux 未驗證；T10 沒有新增實機證據。 |
| 15 | light/dark themes | **PASS** | `src/App.settings.test.tsx`：`toggles theme instantly and persists`、`loads saved settings on startup`；`src/theme.css`；`docs/exec/t07.md`。 | 測試驗證 token/state；不同 OS 的實際顯示未單獨 smoke。 |
| 16 | 調整 editor/preview font size | **PASS** | `src/App.settings.test.tsx`：editor 與 preview 的 live update/persist tests；`docs/exec/t07.md`。 | 未做三平台視覺 smoke。 |
| 17 | settings 跨 launch 持久化 | **PARTIAL** | `src/lib/settings.test.ts` 的 default/merge/save/fallback tests；`src-tauri/src/lib.rs` 的 `settings_json_round_trip_in_temp_dir`、missing-file test；`src/App.settings.test.tsx`；`docs/exec/t07.md`。 | 測試是 Rust temp-dir 與 mocked invoke；沒有實際關閉再啟動 packaged app 的證據。 |
| 18 | Windows、Linux、macOS 的同一體驗與 single installed binary | **PARTIAL** | GitHub Actions runner 實測（run 33178692130）：macOS dmg 3.78MB ✓、Linux deb 4.46MB ✓、AppImage 81.9MB（per-format 100MiB 預算內）；workflow `package.yml` 三平台矩陣。 | AppImage 81.9MB 遠大於其他格式（格式本質）；NSIS 於修正後 runner 待確認；安裝/啟動 smoke 與簽章未驗證。 |
| 19 | 將 `.md` 拖到視窗開啟 | **PASS** | `src/dnd.test.ts` 的 Markdown path、unsupported file、dirty guard、prevent-default tests；`src/App.integration.test.tsx`：`opens a dropped Markdown file through the existing file seam`；`docs/exec/t08.md`、T09 integration test。 | 測試使用 mock/file path；實際拖入 Tauri webview 未在平台上執行。 |
| 20 | preview external links 開系統瀏覽器 | **PARTIAL** | `src/previewLinks.test.ts` 的 http/mailto opener 與 internal anchor tests；`src/App.integration.test.tsx`：`routes preview external links to the system opener`；`src-tauri/tauri.conf.json`/capability 限制；`docs/exec/t08.md`。 | opener seam 已測試，但實際系統瀏覽器啟動與三平台 URL policy 未 smoke。 |
| 21 | preview sanitize 防 script injection | **PASS** | `src/lib/renderMarkdown.test.ts` sanitize golden（script、event handler、javascript URI）；`src/lib/exportHtml.test.ts`；`src-tauri/tauri.conf.test.ts` CSP invariant；`docs/exec/t08.md`。 | 測試與 CSP invariant 通過；未把它延伸成未執行的 packaged runtime 安全審查。 |
| 22 | 記住 window size/position | **UNVERIFIED** | `src/lib/settings.ts`、`src-tauri/src/lib.rs` 有 `windowState` schema 與 JSON round-trip (`settings_json_round_trip_in_temp_dir`)。 | 找不到讀取/套用視窗尺寸位置的 runtime flow 或測試；schema 存在不能推論此 user story 已完成。 |

## T09 packaging evidence boundary

- `docs/exec/t09.md` 記錄 T09 在獨立 worktree 的實際 macOS package run：Darwin arm64 DMG 首次為 3,778,078 bytes；main 最後一次重跑為 3,778,010 bytes，兩者 package-file guard 均 `VERIFIED`。
- **AppImage 尺寸預算（2026-08-28 使用者核准）**：GitHub runner（ubuntu-22.04）實測 AppImage 為 81,885,688 bytes —— 格式內嵌 linuxdeploy runtime 與 webkit2gtk 依賴，15 MiB 對此格式不可達。size guard 改為 per-format：`appimage ≤ 100 MiB`，`dmg`/`nsis`/`deb` 維持 `≤ 15 MiB`。同次 runner 實測 deb 為 4,455,518 bytes（✓）。
- **Windows runner**：NSIS 首跑因 Node 20.12+（CVE-2024-27980）`spawnSync npm.cmd EINVAL` 失敗；已改 `shell:true` 修正（commit `c8b03df`）。修正後 runner（run 33179864092）三平台全綠：macOS dmg 3.78MB、Windows NSIS 2,193,694 bytes、Linux deb 4,455,540 bytes、AppImage 81,885,688 bytes，全部 `VERIFIED`。
- `docs/packaging.md`、`.github/workflows/package.yml`、packaging scripts 與 commit `ae2874e` 證明 target mapping、manifest validation 與 CI workflow 設定；workflow 已於 run 33179864092 實際執行成功。
- Windows NSIS、Linux deb/AppImage、installed footprint、安裝/啟動、簽章與 notarization 結果仍為 **UNVERIFIED**。

## Platform status at T10

| 平台 | T10 可核對結果 |
| --- | --- |
| macOS (Darwin arm64) | npm/Rust 測試與前端 build 通過；T09 有實際 DMG package-file evidence，但沒有安裝或 native GUI evidence。 |
| Windows 10/11 x64 | 未執行；package 與安裝/啟動 **UNVERIFIED**。 |
| Linux x64 | 未執行；deb/AppImage package 與安裝/啟動 **UNVERIFIED**。 |
