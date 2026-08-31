# EOR — macOS hardening wave 1

- 日期：2026-08-30
- 範圍：僅 macOS desktop application；不處理 Linux / Windows 功能或 release artifact。
- 整合分支：`fix/macos-hardening-integration`
- 整合基線：`938bf32`
- 本 wave 合併候選：textarea editor 穩定路徑、檔案生命週期、safe save、settings、window state、watcher、render/export/print parity、task interaction、workspace layout、large-file guard。

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

- 受控原生 textarea 是 v1 editor；它以 React `source` 作為唯一內容真相，保留 dirty、save、native file-open 與 block-anchored preview scroll seams。
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
- `npm run packaging:test` — 15 passed（含 R12 release contract）。
- `npm run package` — macOS arm64 unsigned DMG produced through verified hdiutil fallback; 3,988,866 bytes; package manifest `VERIFIED`.

## L4 review disposition

The functional hardening changes are suitable for mainline integration. The following are not treated as completed release claims:

1. R12 replaces `com.markdowndesk.app` with `io.github.jimmywangpro-gif.markdowndesk` for the first formal release identity. This changes the macOS app-data/signing identity; no installed-user migration was tested because no signed public release exists.
2. MarkdownDesk 目前是本機自用程式；`npm run package` 的 unsigned DMG 是目前交付路徑。`npm run package:macos:release` 保留為未來公開散布的 Darwin-only fail-closed command，要求 `APPLE_SIGNING_IDENTITY` 與 `MACOS_NOTARY_PROFILE`，其 dry-run 明確為 `UNVERIFIED`。Developer ID、notarization、stapling 與 Gatekeeper target-runtime smoke 是 deferred，非目前 blocker。
3. Native Finder association, drag/drop, print panel, system browser launch, multi-monitor behavior and accessibility/visual smoke are target-runtime `UNVERIFIED`.
4. The 8 MiB guard is a responsiveness/safety threshold, not a renderer benchmark or memory-profile claim.

## R12 release-gate evidence

- TDD RED: R12 identifier, missing-setting and release dry-run tests first produced 11 passed / 3 failed; the subsequent app executable assessment policy test produced 14 passed / 1 failed. GREEN: 15 / 15 packaging-contract tests passed.
- Hermes L1/L3: ESLint passed; `npm test` passed (23 files / 165 tests); TypeScript/Vite build passed with the existing chunk-size advisory; Rust fmt/test/clippy passed (20 unit + 11 watcher + 10 safe-save integration tests); `npm audit --omit=dev --audit-level=moderate` found 0 vulnerabilities.
- Package read-back: unsigned `npm run package` created `MarkdownDesk_0.1.0_aarch64.dmg` (3,988,866 bytes); manifest matched macOS/DMG/3,988,866; `hdiutil verify` passed; the bundle `CFBundleIdentifier` read back as `io.github.jimmywangpro-gif.markdowndesk`.
- Local install smoke: the verified unsigned DMG was mounted and its app bundle installed to `/Applications/MarkdownDesk.app`, replacing only the prior app bundle and preserving user data. Read-back confirmed identifier `io.github.jimmywangpro-gif.markdowndesk`, version `0.1.0`, and arm64 executable. `open -a` created the `markdowndesk` process and a standard application quit event exited it cleanly.
- Release dry-run: missing settings exited 1 and named both required settings. Placeholder values exited 0 only for dry-run and emitted `UNVERIFIED`; it did not create a release artifact.
- Public release is `DEFERRED` by product scope: this host has `notarytool`, `codesign`, `spctl`, and `hdiutil`, but `security find-identity -v -p codesigning` exposes only Apple Development, not Developer ID Application; no intended `notarytool` Keychain profile was provided or verified. These facts would block a future public release, but not the current self-use unsigned package. A read-only Codex L4 reviewer stalled in Tauri schema output and was stopped under the failure circuit breaker; its verdict is `UNVERIFIED`, not approval.

## Agent execution notes

All Codex and pi sub-agents were launched with `gpt-5.6-luna` and `xhigh`. Multiple Codex attempts stalled; pi fallback completed the affected tickets. One R03 corrective prompt had a shell quoting issue and was stopped before acceptance; a corrected retry produced the accepted regression fix. No agent output was accepted without independent Hermes test/build evidence.

## Runtime regression follow-up — 2026-08-30

- Root-cause comparison: known-good baseline `938bf32` used a controlled native textarea and no native close-state hook. The first hardening integration (`f6a7444`) introduced both CodeMirror `basicSetup` and `useWindowState`; packaged macOS then showed preview content with an empty CodeMirror surface / line-number and fold gutters.
- Editor resolution: user selected the known-good textarea path. CodeMirror dependencies, component and component tests were removed. The native file-association regression now asserts a real `HTMLTextAreaElement`, loaded Markdown in `.value`, matching rendered preview, and absence of `.cm-editor` / `.cm-gutters`.
- Close resolution: a pending `save_settings` IPC previously kept an accepted dirty close handler unresolved. The regression test was RED; an accepted dirty close now starts best-effort state persistence using the latest geometry but does not await it. Declined discard still calls `preventDefault()`.
- Verification: clean `npm ci` excludes CodeMirror; `npm test` passed 22 files / 164 tests; lint, TypeScript/Vite build, 15 packaging contracts, npm audit, Rust fmt/test/clippy all passed. Latest unsigned arm64 DMG: 3,798,256 bytes, manifest `VERIFIED`, `hdiutil verify` passed.
- Installed runtime smoke: the latest DMG replaced only `/Applications/MarkdownDesk.app`; identifier `io.github.jimmywangpro-gif.markdowndesk`, version `0.1.0`, and arm64 executable were read back. `open -a` with the real SA-01 Markdown path created the native app process, and a standard quit event exited it cleanly after the final clean-close fix.
- Limitation: Screen Recording / Accessibility permission is unavailable, so visual textarea rendering and a real dirty red-button close could not be programmatically inspected. These are not represented as successful GUI visual evidence; their functional contracts are covered by deterministic tests.

## Red-dot close follow-up — 2026-08-31

- macOS unified log recorded repeated `windowShouldClose: prevented close` during the reported red-dot attempts. The earlier non-blocking persistence fix was necessary but insufficient: the remaining blocker was the synchronous browser `window.confirm()` path in packaged WebKit.
- The close guard now uses the already initialized Tauri dialog plugin's async `confirm()` with fail-closed error handling; `dialog:allow-confirm` is granted to the main window. Accepted clean/dirty closes continue to start best-effort geometry persistence without awaiting `save_settings` IPC.
- TDD RED: close tests failed because the native dialog mock was never called while production used `window.confirm()`. GREEN: `App.window-state.test.tsx` 14 / 14, including native confirm true/false, clean/dirty unresolved-save and listener lifecycle cases.
- Latest package was rebuilt after this change, verified as an unsigned arm64 DMG (3,798,674 bytes, manifest `VERIFIED`, `hdiutil verify` valid), then reinstalled to `/Applications/MarkdownDesk.app`. Metadata read back as identifier `io.github.jimmywangpro-gif.markdowndesk`, version `0.1.0`, arm64 executable.
- Native file-open launch plus standard application quit of the latest bundle passed. A direct System Events red-dot click could not enumerate `window 1` and returned Accessibility error `-1719`; this GUI path remains `UNVERIFIED`, not a successful red-dot claim.

## Destroy-capability fix — 2026-08-31

- User confirmed on the previous build: pressing the red close button showed no confirmation dialog and the window stayed open. Unified log again recorded `windowShouldClose: prevented close`.
- Tauri v2 API evidence (`@tauri-apps/api/window.js`): `onCloseRequested` runs the JS handler and, unless `preventDefault()` was called, executes `await this.destroy()`. `destroy()` requires the not-yet-granted `core:window:allow-destroy` permission, so the post-handler destroy silently failed and the window survived after even a confirmed close.
- TDD RED: `src-tauri/tauri.conf.test.ts` capability contract was extended to require `core:window:allow-destroy` (3 passed / 1 failed against the old capability file). GREEN: permission added next to `dialog:allow-confirm`; focused config test passed (4 / 4).
- Full verification after the fix: 22 files / 164 frontend tests, Rust fmt/test/clippy (41 tests), lint, TypeScript/Vite build, 15 packaging contracts, and npm audit all passed.
- Rebuilt unsigned arm64 DMG: 3,798,018 bytes, manifest `VERIFIED`, `hdiutil verify` valid. Reinstalled to `/Applications/MarkdownDesk.app` under explicit user approval; read back identifier `io.github.jimmywangpro-gif.markdowndesk`, version `0.1.0`, arm64 executable, and both `allow-confirm`-family and `allow-destroy` strings are present in the compiled binary.
- Runtime smoke on the newest build: `open -a` with the real SA-01 Markdown file launched the process, and a standard application quit exited it cleanly. The red-button GUI path still could not be auto-clicked (Accessibility `-1719`); manual red-dot verification is pending user confirmation on this build.
