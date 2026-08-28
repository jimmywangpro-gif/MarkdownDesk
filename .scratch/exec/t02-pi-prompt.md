[Stream T02 — renderMarkdown 完整管線 + golden tests]
執行者：pi agent（deepseek-v4-flash:0731-cloud, --thinking max）
worktree：/tmp/markdowndesk-t02（分支 feat/t02-render-pipeline）

[Scope boundary]
Implement/modify ONLY:
- src/lib/renderMarkdown.ts（重寫為 unified 生態完整管線）
- package.json（僅允許 npm install：remark-parse, remark-gfm, remark-rehype, rehype-highlight, rehype-sanitize, unified, highlight.js；不得動其他欄位）
- src/index.css 或 App.css 中 code 高亮樣式（append-only）
Do NOT modify: src/App.tsx、測試檔（先讀後寫的 golden tests 除外）、src-tauri/**。

[Pre-work — read-first]
- src/lib/renderMarkdown.test.ts（T01 最小 golden，必須持續通過）
- src/App.tsx 的 renderMarkdown 使用方式（簽名不得改變）

[Task]
1. 以 unified 生態重寫 renderMarkdown(source: string): string：
   remark-parse + remark-gfm（表格/任務清單/刪除線/autolink）→ remark-rehype → rehype-highlight（程式碼高亮）→ rehype-sanitize（schema 允許 GFM 全元素+highlight class，剝除 script/事件屬性/javascript: URI）。
2. 先補寫完整 golden tests（GFM 八類元素 + sanitize 案例）至 src/lib/renderMarkdown.test.ts，跑出 RED 存證據，再實作至 GREEN。
3. 純函式、無副作用、簽名不變。

[Acceptance criteria]
- GFM 八類元素（標題/巢狀清單/表格/任務清單/刪除線/autolink/引用/程式碼高亮）golden 全綠
- sanitize 案例（script/onerror/javascript:）全剝除
- bundle 增幅 ≤ 300KB gzipped（npm run build 後比對）
- 先 RED 後 GREEN 證據留存

[Test commands]
npm test && npm run build

[SELF-TEST gate]
跑上述指令確認全綠才交付；無法執行標 UNVERIFIED。

[Commit]
feat(t02): unified renderMarkdown pipeline with GFM golden tests