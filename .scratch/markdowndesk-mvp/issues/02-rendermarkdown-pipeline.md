# 02 — renderMarkdown 管線 + golden tests

**What to build:** 純函式 `renderMarkdown(source: string): string`：unified 生態（remark-parse + remark-gfm + rehype-highlight + sanitize）輸出 HTML 字串。Golden tests 涵蓋 GFM 全元素（標題/巢狀清單/表格/任務清單/刪除線/autolink/引用/程式碼高亮）與 sanitize 案例（`<script>`、`onerror` 等事件屬性、`javascript:` 連結剝除）。先寫測試確認 RED，再實作至 GREEN（TDD gate）。

**Blocked by:** 01。

**Status:** ready-for-agent

**執行者（已裁示）：pi agent（deepseek-v4-flash:0731-cloud, --thinking xhigh）**

- [ ] golden tests 全綠，涵蓋 GFM 八類元素
- [ ] sanitize tests 全綠：script/事件屬性/js: URI 全數剝除
- [ ] 渲染為純函式、無副作用、可獨立呼叫
- [ ] 體積預算：新增依賴總和使 bundle 增幅 ≤ 300KB gzipped
- [ ] 先 RED 後 GREEN 的證據留存（測試先失敗的輸出紀錄）