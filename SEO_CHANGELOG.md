# SEO 变更日志（SEO_CHANGELOG）

> 规则：凡涉及搜索引擎、SEO、GEO、AI 搜索可见性、页面标题/描述/结构、关键词、索引、链接、站点地图、robots、canonical、hreflang、Schema 等，必须逐项追加记录。不得只在批次结束时补记。

## 记录要求

- 每条记录使用唯一编号：SEO-0001、SEO-0002……
- 修改前先读取并保留基准内容；标题、描述、页面结构的每一项变更分别记录。
- 同一批次涉及多个页面或语言时，按页面/语言拆分记录，避免合并成无法追踪的一条。
- 写明修改前、修改后、原因、目标查询词/关键词、涉及文件、验证结果和部署状态。
- 未验证的内容标记为“待验证”；不得写成已成功。
- 仅编辑文档或规则文件、不改变网站搜索表现的操作，也应说明其属于“流程/文档变更”，不要伪装成网站 SEO 优化。
- 发生回滚或再次修改时，追加新记录，不删除旧记录。

## 记录模板

```markdown
## SEO-0001 — 简短变更名称

- 日期：
- 页面/语言：
- 修改类别：
- 修改前：
- 修改后：
- 目标关键词/搜索意图：
- 修改原因：
- 涉及文件：
- 验证方式与结果：
- 部署状态：
- 备注：
```

---

## 初始化记录

### SEO-0000 — 建立 SEO 基准与变更记录制度

- 日期：2026-11-06
- 页面/语言：全站；10 种语言
- 修改类别：流程/文档变更（非网站页面 SEO 内容变更）
- 修改前：仓库尚未建立统一的 SEO 基准档案与逐项变更日志。
- 修改后：新增 `SEO_BASELINE.md` 与 `SEO_CHANGELOG.md`，建立修改前核对、逐项记录、验证后更新部署状态的流程。
- 目标关键词/搜索意图：不适用；本条仅记录管理流程建立。
- 修改原因：确保所有搜索相关修改可追溯、可比较、可回滚。
- 涉及文件：`SEO_BASELINE.md`、`SEO_CHANGELOG.md`
- 验证方式与结果：已读取 main 分支基准树并记录 SEO 相关文件路径及 Blob SHA；未进行页面 SEO 内容修改。
- 部署状态：不涉及网站部署；文件提交至 GitHub 后生效于版本库。
- 备注：基准提交 `1c3f7818a794693426cdbbdfce22527d312433dc`。


## 2026-11-07 — Add two new product detail page groups (working branch)

- Scope: two product detail pages for the newly supplied white top-opening design and digital-display design, each localized under all 10 existing language directories.
- New page URL patterns: `/{locale}/products/white-top-opening/` and `/{locale}/products/digital-display/` for en, ja, ko, es, pt, de, ru, ar, zh-cn and zh-tw (20 URLs total).
- Page title changes: each of the 20 new pages has its own localized title; the title names the design rather than exposing an unconfirmed factory model number.
- Meta description changes: each of the 20 new pages has its own localized description and states that technical specifications are supplied after confirmation.
- Page structure changes: added product overview, verified heating/drying and volume-reduction process, design highlights, a technical-information table with unconfirmed values marked “To be confirmed”, OEM/ODM customization information, and inquiry CTA.
- Structured data: added Product JSON-LD with no invented capacity, power, voltage, frequency, processing volume, certification, price or availability values.
- Product collection structure: added two localized product cards to each of the 10 existing product collection pages; collection-page titles and meta descriptions were not changed in this batch.
- Sitemap: added 20 localized detail-page URLs with reciprocal hreflang alternates and x-default links.
- Image paths referenced: `/assets/images/shl-23c-white-kitchen.webp` and `/assets/images/shl-25-digital-display.webp`. These image binaries still need to be committed to the repository before deployment; do not publish/deploy this branch until both assets are present and verified.
- Backups: original product collection HTML pages were copied to `SEO-BACKUPS/2026-11-07/pre-two-product-pages/`; original sitemap copied to `SEO-BACKUPS/2026-11-07/sitemap.xml.before-two-product-pages`.
- Status: implementation is on branch `add-two-product-detail-pages`; not merged to main and not deployed.
