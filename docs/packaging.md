# MarkdownDesk packaging

MarkdownDesk uses the Tauri v2 native bundler. The repository has one rerunnable
entry point:

```sh
npm ci
npm run package
```

`npm run package` checks the checked-in target mapping, selects only the native
bundle for the current host, runs `tauri build --ci --no-sign`, verifies that
the expected files exist, measures their byte sizes, and writes a manifest to
`src-tauri/target/packaging/<platform>/manifest.json`.

On macOS, if Tauri's optional Finder-prettifying DMG step cannot run in a
headless/non-Finder session, the script only falls back after confirming that
the same run produced a fresh `.app`; it then calls the native `hdiutil create`
command and validates that real DMG file. A stale or missing `.app` fails the
run. The fallback is still an actual disk image, not a placeholder artifact.

## Host-to-bundle mapping

| Host | Bundle | Expected output |
| --- | --- | --- |
| macOS (`darwin`) | `dmg` | `src-tauri/target/release/bundle/dmg/*.dmg` |
| Windows (`win32`) | `nsis` | `src-tauri/target/release/bundle/nsis/*.exe` |
| Linux (`linux`) | `deb`, `appimage` | `.../bundle/deb/*.deb`, `.../bundle/appimage/*.AppImage` |

The Tauri config explicitly lists all four supported targets so the mapping is
auditable. The packaging script never asks a host to produce a foreign bundle.
On an unsupported host it exits with an explicit `Unsupported packaging host`
error; it does not create or claim an artifact. `npm run package -- --dry-run`
prints `UNVERIFIED` and creates no artifact.

The checked-in validation can be run independently:

```sh
npm run packaging:test
npm run packaging:validate
```

Without a generated manifest, `packaging:validate` reports `UNVERIFIED` rather
than inventing a result. With a manifest it validates platform, format, actual
file extension, deterministic logical artifact name, and measured byte count.

Logical names have the form:

```text
markdowndesk-<platform>-<format>-<actual-tauri-file-name>
```

The actual filename remains the filename produced by Tauri, for example an NSIS
installer ending in `-setup.exe`.

## Size evidence

The guard is `15 * 1024 * 1024` bytes. Each manifest artifact contains the
actual filesystem byte count and a `sizeMiB` display value. `sizeStatus` is:

- `VERIFIED`: every listed package file was measured and is at or below the
  guard;
- `FAILED`: a measured package file exceeds the guard and packaging exits
  non-zero;
- `UNVERIFIED`: the required file or measurement is unavailable.

This pipeline measures package files (`measurement: "package-file"`). It does
not call a package manager to install the app, so it must not be read as a
claim about installed footprint. An installed-size claim remains `UNVERIFIED`
until a target-platform install measurement is performed.

Bundles are intentionally unsigned in this reproducible pipeline. Signing,
notarization, and Windows trust metadata require platform credentials and are
release-environment concerns.

## GitHub Actions evidence

`.github/workflows/package.yml` runs the same `npm run package` command on a
matrix of `macos-14`, `windows-2022`, and `ubuntu-22.04`. Each job validates and
uploads the native package files plus its size manifest as
`markdowndesk-<platform>`.

This is required because a macOS host cannot natively produce a Windows NSIS
installer or Linux `deb`/AppImage. Until those jobs run successfully, those
platforms are `UNVERIFIED`; no local macOS result stands in for them.

The current local CLI check used Tauri CLI 2.11.4. Its `tauri build --help`
reports `--bundles` as a space- or comma-separated list, with bundle choices
filtered by the current operating system. The script passes the native list as
separate arguments and does not rely on undocumented cross-compilation.
