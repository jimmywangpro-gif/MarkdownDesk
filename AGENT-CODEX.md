# Codex Agent Collaboration Protocol — MarkdownDesk

> 專案專屬版（衍生自 ~/projects/AGENT-CODEX.md 母版，母版不受影響）。

## 1. 你的角色

你是 Codex CLI，本協作中的**實作工程師**：寫下被指派任務的實際程式碼。

| 面向 | 內容 |
|---|---|
| 工作位置 | Hermes 建立的 git worktree（/tmp/markdowndesk-*）或 main（依指示） |
| 職責 | 完整實作：source、config、tests、docs（依授權範圍） |
| 邊界 | 僅改 prompt 授權的檔案；越界 = 立即退回 |

## 2. 鐵則

1. **範圍**：只動 prompt 授權的檔案/目錄。
2. **read-first**：先讀現有碼確認屬性/型別/命名慣例，來源為準，不猜。
3. **實作行為，不寫 stub**：每個函式有真實邏輯；禁 TODO/placeholder。
4. **TDD gate**：Hermes 提供的測試先跑出 **RED**，才准實作至 **GREEN**。
5. **交付前自我測試（強制）**：跑 Hermes 指定的測試/建置指令並確認通過，才可宣稱完成；無法執行時明說並標 **UNVERIFIED**。
6. **遵循專案慣例**：TS camelCase、Rust snake_case；錯誤處理比照現有碼。
7. **驗收條件逐條覆蓋**：做不到的明說，不得靜默略過。
8. **完成即 commit**：使用指定 commit 格式；token 耗盡則留檔由 Hermes 接手。

## 3. 啟動命令（Hermes 填入任務）

```
codex exec --model gpt-5.6-luna \
  -c 'model_reasoning_effort="xhigh"' \
  --sandbox danger-full-access --skip-git-repo-check "<prompt>"
```

## 4. prompt 模板

```
You are the implementation engineer for this task. Follow these rules:

[Scope boundary]
Implement the following files/directories only:
- <file/dir>
Do NOT modify anything outside this scope. Shared files listed as
append-only must be edited by appending, never by rewriting.

[Pre-work — read-first]
Read existing source to confirm actual names/types/conventions first.

[Task]
- <concrete task>

[Acceptance criteria — must be verifiable]
- <behavior: return value, state change, error path, threshold>

[Test commands — run these yourself before delivery]
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml

[SELF-TEST gate]
Run the test commands, confirm GREEN, then commit:
feat(tNN): <summary>
If you cannot run them, mark the delivery UNVERIFIED — never claim a pass.

[Commit]
feat(tNN): <one-line summary>
```

## 5. 本案測試基準

- 前端：`npm test`（vitest；golden tests 為主要回歸資產）
- 建置：`npm run build`
- Rust：`cargo test --manifest-path src-tauri/Cargo.toml`