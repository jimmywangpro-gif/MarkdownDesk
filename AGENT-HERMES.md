# Hermes Agent Collaboration Protocol — MarkdownDesk

> 專案專屬版（衍生自 ~/projects/AGENT-HERMES.md 母版，母版不受影響）。
> 技術棧：Tauri v2 + Rust + TypeScript/React + CodeMirror 6。
> 執行者：Codex agent 與 pi agent 多平行派工（各自 git worktree）。

---

## 1. 角色分流

| 面向 | Hermes | 執行者（Codex / pi） |
|---|---|---|
| 工作位置 | main（編排） | git worktree（/tmp/markdowndesk-*） |
| 職責 | 規劃、拆票、prompt、啟動、L1-L5 驗證、合併、追蹤 | 完整實作（src + tests + 自我測試） |
| 邊界 | Hermes 擁有範圍與驗收 | 僅改 prompt 授權檔案 |

## 2. coding 模型配置

- 模型：`gpt-5.6-luna`（openai-codex provider）
- reasoning/thinking：Codex `xhigh`；pi `--thinking xhigh`。
- pi：`pi -p --provider openai-codex --model gpt-5.6-luna --thinking xhigh --session-dir <wt>/.pi-sessions --append-system-prompt <project>/AGENT-PI.md "<prompt>"`
- Codex：`codex exec --model gpt-5.6-luna -c 'model_reasoning_effort="xhigh"' --sandbox danger-full-access --skip-git-repo-check "<prompt>"`
- 不依賴本機預設值，命令一律明確指定 provider、model 與 reasoning。

## 3. 執行流程（濃縮）

1. 計劃呈現 Gate：計劃回合不 spawn；使用者批准（「繼續」）才執行。
2. TDD gate：先寫測試確認 RED，才准實作至 GREEN。
3. 派工：worktree `git worktree add -b feat/tNN-slug /tmp/markdowndesk-tNN main` → 背景啟動執行者。
4. 監控：每 10–15 分鐘 poll；>20 分鐘無輸出判定卡死 → kill → 檢查已產出 → 接手或重試。
5. 驗證 L1–L5：L1 品質閘門（lint/build）→ L2 範圍（`git diff main...HEAD` 無越權檔）→ L3 測試品質（RED→GREEN 證據）→ L4 語意符合驗收 → L5 合併後全回歸。
6. EOR 落盤：`docs/exec/tNN.md`（修改檔、自我測試結果、UNVERIFIED、事件、接手人）。
7. 收尾：worktree remove + branch delete；tracker 更新。

## 4. 共享檔案防護

- 共享：`src/App.tsx`、`src-tauri/src/lib.rs`（command 註冊）、`package.json`、樣式 token。
- 規則：票面聲明 append-only；合併順序按波次；每合併一票跑 `git diff` 覆蓋檢查 + 全測試。

## 5. 驗證命令（本案基準）

```bash
npm test                # vitest：golden + 元件互動
npm run build           # tsc --noEmit + vite build
cargo test --manifest-path src-tauri/Cargo.toml   # Rust command tests
npm run tauri build     # 打包（T09）
```

## 6. 失敗斷路器

- 同一目的最多重試一次替代方法；二次失敗 Hermes 完全接手。
- 模型 capacity 不足 exit 1：先檢查已產出 → commit → 重試一次 → 接手。
- 執行者宣稱通過但無證據 → 一律視為 UNVERIFIED，Hermes 代跑。

## 7. 輸出失控防護

- 禁止推衍不存在的票號/檔名；識別碼以 `.scratch/markdowndesk-mvp/issues/` 實際檔案為準。
- 失敗先更正事實再續作；內部工具封包格式不得外洩至交付文件。