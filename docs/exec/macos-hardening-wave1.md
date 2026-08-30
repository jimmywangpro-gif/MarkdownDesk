# EOR — macOS hardening wave 1

- 日期：2026-08-30
- 範圍：僅 macOS desktop application；不處理 Linux / Windows 功能或 release artifact。
- 整合分支：`fix/macos-hardening-integration`
- 整合基線：`938bf32`
- 本 wave 合併候選：CodeMirror 6、檔案生命週期、safe save、settings、window state、watcher、render/export/print parity、task interaction、workspace layout、large-file guard。

## TDD evidence

| Ticket | RED evidence | GREEN evidence |
|---|---|---|
| Safe save / conflict | frontend save seam 缺少 expected mtime；Rust `save_file` 缺第三個版本參數（E0061） | expected mtime conflict、atomic write、dirty state tests 通過 |
| Settings integrity | invalid font/window values 與 concurrent save queue 3 failures | validation 與 serialized save tests 通過 |
| Render/export/print | CSP hardening、table style、title bar print 3 failures | focused 17 tests 通過 |
| Workspace layout | fixed flex ratio / toolbar overflow 3 failures | focused 6 tests 通過 |
| Watcher burst | one save burst 造成 4 reads 而非 2 | coalesced reload tests 通過 |
| Watcher latest change | first pending reload 時第二次 change 遺失 | latest external content regression 通過 |
| Window recovery | `availableMonitors` 未呼叫，2 failures | monitor work-area recovery tests通過 |
| Large-file guard | oversized open 沒有 status，2 failures | 8 MiB guard tests 通過 |

## Included behavior

- CodeMirror 6 Markdown editor replaces raw textarea while保留 source、dirty、save、preview scroll seams。
- Saved Markdown files use expected version checks and macOS atomic temp-file/rename writes.
- External watcher uses macOS parent-directory watch, atomic-replacement coverage, path identity checks, burst coalescing, and follow-up reload for a later pending change.
- Settings validate theme, font sizes, split ratio and native window integer ranges; writes are serialized.
- Native window lifecycle restores saved geometry, protects dirty close and recovers an off-screen saved position through monitor work areas.
- Preview task checkboxes can update Markdown source and dirty state.
- Standalone export uses table wrapper/alignment styles; print hides title-bar and toolbar chrome; CSP has explicit `object-src`, `base-uri`, and `form-action` restrictions.
- Workspace ratio has fixed editor flex behavior, accessible separator values, and horizontally scrollable narrow toolbar.
- Files larger than 8 MiB UTF-8 source bytes are rejected before editor/render/recent/watcher handoff.

## Hermes independent verification

- `npm run lint` — passed.
- `npm test` — 23 test files / 165 tests passed.
- `npm run test:coverage` — statements 87.43%, branches 77.73%, functions 88.93%, lines 90.16%; thresholds passed.
- `npm run build` — passed; Vite chunk-size advisory remains.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` — passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` — 20 unit + 11 macOS watcher + 10 safe-save integration tests passed.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings` — passed.
- `npm audit --omit=dev --audit-level=moderate` — 0 vulnerabilities.
- `npm run packaging:test` — 11 passed.
- `npm run package` — macOS arm64 DMG produced through verified hdiutil fallback; 3,988,908 bytes; package manifest `VERIFIED`.

## L4 review disposition

The functional hardening changes are suitable for mainline integration. The following are not treated as completed release claims:

1. `com.markdowndesk.app` triggers a Tauri warning because the identifier ends with `.app`; changing it requires an explicit migration decision because it can alter app-data and signing identity.
2. The package command explicitly uses `--no-sign`; Developer ID signing, notarization, stapling and Gatekeeper assessment remain blocked by release credentials/environment.
3. Native Finder association, drag/drop, print panel, system browser launch, multi-monitor behavior and accessibility/visual smoke are target-runtime `UNVERIFIED`.
4. The 8 MiB guard is a responsiveness/safety threshold, not a renderer benchmark or memory-profile claim.

## Agent execution notes

All Codex and pi sub-agents were launched with `gpt-5.6-luna` and `xhigh`. Multiple Codex attempts stalled; pi fallback completed the affected tickets. One R03 corrective prompt had a shell quoting issue and was stopped before acceptance; a corrected retry produced the accepted regression fix. No agent output was accepted without independent Hermes test/build evidence.
