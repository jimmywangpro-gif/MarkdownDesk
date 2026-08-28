# MarkdownDesk

MarkdownDesk 是以 **Tauri v2** 打包的桌面 Markdown 編輯器。它把編輯器與即時預覽放在同一個視窗，並以每個目標平台的原生執行檔作為應用程式本體；DMG、NSIS、deb 與 AppImage 是不同平台的安裝外層，不是 Electron 或遠端服務。

本 README 不提供下載網址、發行版本或未產生的檔名。要取得安裝包，請在對應平台依下方的 packaging 指令實際產生，或使用已成功執行的 CI artifact。

## 支援平台與限制

| 平台 | 規格中的目標 | 原生 bundle |
| --- | --- | --- |
| macOS | 12+；Apple Silicon 先行 | DMG |
| Windows | 10/11 x64 | NSIS installer |
| Linux | x64 | deb、AppImage |

Tauri packaging 只在原生主機產生該主機的 bundle：macOS 不會假造 Windows NSIS 或 Linux 套件。GitHub Actions workflow 已配置三個 runner，但目前沒有 Windows/Linux runner 或安裝結果證據，因此這兩個平台目前是 **UNVERIFIED**。T09 曾在 Darwin arm64 實際產生 3.603 MiB 的 DMG package-file，證據詳見 `docs/exec/t09.md`；這不是安裝後大小。簽章、notarization、Windows trust metadata 與實際安裝後大小同樣未宣稱已驗證。

功能限制：v1 不包含 WYSIWYG 行內編輯、協同編輯、雲端同步、帳號、行動版、數學公式、Mermaid、外掛、圖片資源管理或多檔分頁。PDF 使用 webview 原生列印；外部連結交給系統瀏覽器；檔案對話框、拖放與列印的完整 GUI 行為仍須在目標平台實機確認。

## 開發環境

所有平台都需要：

- Node.js 與 npm
- Rust stable toolchain
- Tauri v2 所需的本平台 WebView/編譯工具

額外平台需求：

- **macOS**：Xcode Command Line Tools。
- **Windows**：Microsoft C++ Build Tools（MSVC）與 WebView2 runtime。
- **Linux**：GTK/WebKitGTK 與編譯工具。Ubuntu runner 使用的依賴可用下列命令安裝：

  ```sh
  sudo apt-get update
  sudo apt-get install -y \
    libwebkit2gtk-4.1-dev build-essential curl wget file \
    libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
  ```

安裝 JavaScript 依賴：

```sh
npm ci
```

## 啟動與開發

啟動完整 Tauri 桌面程式（包含 native command）：

```sh
npm run tauri -- dev
```

只啟動 Vite 前端開發伺服器：

```sh
npm run dev
```

前端-only 模式適合編輯 UI；原生檔案對話框、檔案監看、設定儲存、HTML 寫入與系統 opener 在非 Tauri 環境會是 mock/fallback 或不可用。

## 測試與建置

```sh
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
git diff --check
```

一次執行前端測試與建置：

```sh
npm test && npm run build
```

`npm run build` 會先執行 TypeScript 檢查，再建立 Vite production bundle。Rust 測試使用實際暫存目錄 I/O 覆蓋檔案、最近檔案、監看與設定資料層；GUI 原生對話框、系統列印與目標平台安裝不是這些測試的替代品。

## 打包

單一可重跑入口如下。它依目前主機選擇原生 bundle，驗證實際檔案副檔名與 byte size，並寫入該次產生的 manifest：

```sh
npm run package
```

主機與輸出格式對應：

| 執行主機 | 指令選用的 bundle | 產物目錄 |
| --- | --- | --- |
| macOS | `dmg` | `src-tauri/target/release/bundle/dmg/` |
| Windows | `nsis` | `src-tauri/target/release/bundle/nsis/` |
| Linux | `deb`、`appimage` | `src-tauri/target/release/bundle/deb/`、`src-tauri/target/release/bundle/appimage/` |

驗證 packaging contract 與 manifest：

```sh
npm run packaging:test
npm run packaging:validate
```

沒有本地主機 manifest 時，`npm run packaging:validate` 會輸出 `UNVERIFIED`，不是成功的安裝或發行證據。預覽打包計畫而不產生檔案：

```sh
npm run package -- --dry-run
```

此 pipeline 不做簽章。15 MiB 是 package-file 的 guard；只有實際量測並寫入 manifest 的 package file 才能標示 `VERIFIED`，不能把它解讀成已安裝 footprint。

## 安裝已產生的套件

以下步驟只適用於 `npm run package` 成功後，在對應 bundle 目錄找到的實際檔案：

- **macOS DMG**：開啟該 `.dmg`，將 MarkdownDesk app 拖到 Applications，再從 Applications 啟動。
- **Windows NSIS**：執行該 `.exe` installer，依安裝程式畫面完成安裝。
- **Linux deb**：在 deb 目錄執行 `sudo apt install ./<實際產生的檔案>.deb`。
- **Linux AppImage**：執行 `chmod +x ./<實際產生的檔案>.AppImage`，再執行該 AppImage。

目前 repository 沒有可供下載的 release artifact；Windows、Linux 的產出、安裝與執行，以及 macOS 的完整 DMG GUI smoke test，都必須以實際目標平台結果補上後才可改標為已驗證。

## macOS 設定 `.md` 預設使用 MarkdownDesk

MarkdownDesk 的 macOS bundle 已宣告支援 `.md` 與 `.markdown`，但 macOS 的預設開啟程式仍需由 Finder 設定。請先用 `npm run package` 產生並安裝最新 DMG 版本，再執行：

1. 在 Finder 選取任一個 `.md` 檔案。
2. 按 `⌘I` 開啟「取得資訊」。
3. 在「開啟檔案方式」選單選擇 **MarkdownDesk**。若清單沒有它，選「其他⋯」，到 `/Applications/MarkdownDesk.app` 選取它，並勾選「永遠用此程式開啟」。
4. 按「全部更改⋯」，確認後按「繼續」。
5. 關閉資訊視窗；之後在 Finder 雙擊 `.md`／`.markdown` 就會以 MarkdownDesk 開啟。

也可以用下面的命令快速測試已安裝的 app 是否能接收檔案：

```sh
open -a "/Applications/MarkdownDesk.app" "/path/to/example.md"
```

首次以 Finder 雙擊檔案時，MarkdownDesk 會透過 macOS `Opened` event 讀取檔案；若程式已有未儲存變更，會先顯示 dirty-state 確認。association 設定與 event routing 有自動測試，但 Finder 實際「全部更改」及雙擊 GUI 行為仍應在本機目視確認。
