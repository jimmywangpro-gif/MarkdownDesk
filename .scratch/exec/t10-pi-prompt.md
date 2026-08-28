[Stream T10 — 最終回歸 + 文件收尾]
執行者：pi agent（gpt-5.6-luna, openai-codex, --thinking xhigh）
worktree：/tmp/markdowndesk-t10（分支 feat/t10-regression-docs；必須自 T09 已合併的最新 main 建立）

[Scope boundary]
Implement/modify ONLY:
- README.md（新建或更新：使用者安裝、開發、測試、三平台 packaging、限制）
- docs/ACCEPTANCE.md（新建：SPEC 22 user stories 對應實際測試/證據/平台狀態）
- docs/exec/t10.md（本票 EOR）
- docs/PITFALLS.md（只可 append 本票新發現，禁止重寫既有紀錄）
Do NOT modify src/**、src-tauri/**、package.json、workflow、既有測試或任何功能程式碼。

[Pre-work — read-first]
- 讀取 docs/SPEC.md、issues/01–10、所有 docs/exec/t01–t09（存在者）與 docs/PITFALLS.md。
- 以工具實際執行 npm test、npm run build、cargo test；讀取 T09 package evidence，不把未執行的 Windows/Linux 當成已驗證。
- 確認目前 git status、最近 commit 與測試基準。

[Task]
1. README：說明 Tauri v2 單一執行檔定位、macOS/Windows/Linux 開發與安裝方式、dmg/NSIS/deb/AppImage、測試命令、平台限制與未驗證項目；不得寫不存在的下載 URL、版本或產物。
2. docs/ACCEPTANCE.md：逐條列出 SPEC 的 22 user stories，標示 PASS/UNVERIFIED/PARTIAL，附實際測試或 EOR 路徑；不替缺失證據補推論。
3. EOR：記錄本票修改檔、實際命令結果、文件缺口與未驗證平台。
4. 先文件/驗證 RED（若有新增文件檢查腳本，先讓檢查失敗）再完成最小文件變更；不要藉文件工作修改功能碼。

[Acceptance criteria]
- README 可讓新開發者依指令啟動、測試與打包。
- 22 條 user stories 均有可追溯狀態，未驗證項目明確標示。
- npm test/build/cargo test 的數字與實際輸出一致；git diff --check 通過。

[Test commands]
npm test && npm run build
cargo test --manifest-path src-tauri/Cargo.toml
git diff --check

[SELF-TEST gate]
交付前執行上述命令並逐條回報；缺證據標 UNVERIFIED，不得宣稱 release 完整。

[Commit]
docs(t10): final regression evidence and project documentation