[Stream T03 — 分屏佈局 + 模式切換 + 同步捲動 — resume]
執行者：Codex agent（gpt-5.6-luna, openai-codex, reasoning xhigh）
worktree：/tmp/markdowndesk-t03（分支 feat/t03-split-view；既有 commit 20aea21，需整合目前 main）

[Scope boundary]
Implement/modify ONLY:
- src/App.tsx（重寫為三模式分屏結構；保留 renderMarkdown 使用方式與既有 data-testid）
- src/App.css（append/調整分屏與模式樣式）
- src/components/（新建元件檔，可自由切分）
- src/lib/useSyncScroll.ts（新建：捲動同步 hook）
- src/lib/renderMarkdown.ts（不得動；僅可新增匯出 helper 若同步捲動需要區塊錨點）
- 測試：src/App.test.tsx 可 append 新測試（既有 3 tests 不得刪改）
Do NOT modify: renderMarkdown 管線本體、package.json（除非需新增 dev 依賴，先說明）、src-tauri/**。

[Pre-work — read-first]
- src/App.tsx（T02 合併後狀態）
- src/lib/renderMarkdown.ts（匯出介面）
- src/App.test.tsx（既有契約）

[Resume instructions]
- 既有 commit `20aea21` 已包含 T03 實作與測試；不要重寫已正確的功能。
- 先執行 `git merge main` 將目前 T04/T07/T02 基線納入本分支；只在允許範圍內解決 App.tsx/App.css/renderMarkdown.ts 衝突，保留檔案整合、主題/設定與 Markdown sanitize 管線。
- 修正已觀察到的 `src/App.css` unbalanced `@media` CSS 語法問題；不得留下 build warning。
- 若既有 T03 測試已存在，視為本次續作的測試基線；缺少舊 RED transcript 時不得捏造，回報 `RED UNVERIFIED`。

[Task]
1. 三模式：edit（僅編輯器）/ view（僅預覽）/ split（雙窗格），工具列按鈕 + 快捷鍵（Cmd/Ctrl+1/2/3 或 E/V/S）切換；預設 split。
2. 同步捲動：split 模式下，編輯器游標所在區塊 → 預覽對應元素錨定捲動（區塊級，非像素級）。renderMarkdown 需輸出 data-block-index 屬性（或等價錨點機制）以建立行↔區塊對映；實作方式自訂，測試需可驗證。
3. 即時渲染 debounce ~150ms（可測：vi.useFakeTimers）。
4. 測試：模式切換、debounce、捲動錨定（jsdom 可測 scrollTop 賦值），先 RED 後 GREEN。
5. main 現有 31 tests（T01+T02+T07）不得回歸；App.tsx 現況含 T07 工具列（SettingsContext/主題切換/字級）— 重寫時必須保留該整合（模式切換按鈕加入工具列，勿移除主題/字級控制）。

[Acceptance criteria]
- 三模式切換正確且快捷鍵可用
- 游標移動時預覽錨定對應區塊（可程式化驗證）
- debounce 生效（fake timers 驗證）
- 既有測試全綠；npm run build 通過

[Test commands]
npm test && npm run build

[SELF-TEST gate]
全綠才交付；無法執行標 UNVERIFIED。

[Commit]
feat(t03): tri-mode split view + block-anchored sync scroll + render debounce