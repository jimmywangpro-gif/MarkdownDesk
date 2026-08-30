# MarkdownDesk macOS hardening tickets

這組 tickets 由 2026-08-30 的 macOS-only 完整分析轉換而來，使用 Matt Pocock `to-tickets` breakdown。

## Scope

- 只處理 macOS desktop app
- 不處理 Linux / Windows
- 每個 ticket 是可獨立驗證的垂直切片
- ticket 編號依 dependency order
- `Status: ready-for-agent` 只表示已具備實作條件，不表示已完成

## Priority

- **P0**：資料遺失、macOS 原生 lifecycle 或正式 release blocker
- **P1**：核心驗收缺口，正式交付前應完成
- **P2**：效能、可維護性與體驗強化

## Execution order

1. `01` editor contract decision
2. `02` safe save / conflict protection
3. `03` native close / listener lifecycle
4. `04` settings persistence integrity
5. `05` external watcher
6. `06` window geometry persistence
7. `07` document operation errors / recent consistency
8. `08` preview/export/print parity
9. `09` interactive task list
10. `10` workspace layout / accessibility
11. `11` large-file performance
12. `12` signed/notarized release gate

## Parallelization

- `01`、`02`、`03`、`04`、`08` 可在邏輯上各自開始。
- 由於 `App.tsx` 與 macOS lifecycle 共享責任，`02`、`03` 不建議由不同 agent 同時修改。
- `05` 依賴 `02` 的檔案版本契約。
- `06` 依賴 `04` 的設定保存契約。
- `07` 依賴 `02`、`05` 的 document state/result 契約。
- `12` 是最後 release gate，不能以未簽章 DMG 取代。

## Progress snapshot — 2026-08-30

| Ticket | Actual status | Evidence boundary |
|---:|---|---|
| 01 | completed | CodeMirror 6 migration 已合併 main；L5 165 frontend tests passed。 |
| 02 | completed (code-level) | expected mtime conflict + macOS atomic write；Save As native dialog仍 UNVERIFIED。 |
| 03 | completed (code-level) | native close lifecycle與listener cleanup tests；packaged close smoke仍 UNVERIFIED。 |
| 04 | partial | frontend validation/serialized saves已完成；Rust settings atomic write與可見 persistence failure待補。 |
| 05 | completed (code-level) | atomic replacement、canonical identity、burst與latest-change watcher tests；native GUI smoke待補。 |
| 06 | completed (code-level) | monitor work-area recovery與window state tests；multi-monitor packaged smoke待補。 |
| 07 | partial | primary operation error/recent paths已整合；native dialog full matrix待補。 |
| 08 | completed (code-level) | export table parity、print chrome、CSP hardening；WebView/print GUI待補。 |
| 09 | completed (code-level) | interactive task/source/dirty/nested mapping tests；native reopen smoke待補。 |
| 10 | partial | flex/ARIA/narrow toolbar CSS contract；packaged visual/keyboard smoke待補。 |
| 11 | partial | 8 MiB UTF-8 guard；benchmark/memory/arm64 GUI performance待補。 |
| 12 | blocked | Developer ID signing, notarization, stapling, Gatekeeper與quarantine smoke需要release credentials/environment。 |

## Wave 1 L5 evidence

- `npm run lint` passed.
- `npm test` passed: 23 files / 165 tests.
- `npm run test:coverage` passed: statements 87.43%, branches 77.73%, functions 88.93%, lines 90.16%.
- `npm run build`, Rust fmt/test/clippy, npm audit, and packaging contract all passed.
- macOS arm64 package file was produced and measured at 3,988,908 bytes, but signing/notarization remains blocked.
