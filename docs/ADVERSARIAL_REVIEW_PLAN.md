# Gate 1 对抗审核档案 — 设计方案与 Android 知识大纲

- **审核模型**：`claude-opus-5-5-high`（Swarm Worker：`opus-reviewer`）
- **审核时间**：2026-11-20
- **审核范围**：`个人建站需求.txt`、`AGENTS.md`、`GEMINI.md`、`CLAUDE.md`、`.agents/skills/*`、`docs/DESIGN_PLAN.md`、`docs/ANDROID_SYLLABUS.md`
- **最终结论**：**`PASS WITH REVISIONS`**（`P0: 0` / `P1: 8` / `P2: 18` / `P3: 10`）

---

## 1. 关键发现与处置汇总（P1 Major · 8 项全部采纳并修复）

| 编号 | 审核发现摘要 | 风险与失效场景 | 修订措施与落盘位置 |
| :--- | :--- | :--- | :--- |
| **P1-1** | Markdown → Vue 渲染边界未定义 | 构建期编成纯 HTML 后 `v-html` 无法挂载 SVG 组件；`?compiled` 非 Vite 内置能力；静态映射表会打爆首屏 Bundle | 在 [DESIGN_PLAN.md §3.2](./DESIGN_PLAN.md) 定义 `.md?compiled` 输出结构化 `QuestionBlock[]`（`html \| diagram \| mermaid`），SVG 通过 `import.meta.glob` + `defineAsyncComponent` 按需懒加载，引用不存在组件时构建期报错阻断 |
| **P1-2** | 题目 ID 与 Slug 强依赖目录顺序号 | 后续增删改题目重排编号后，`localStorage` 进度、笔记与 URL 会集体失效孤立 | 在 [DESIGN_PLAN.md §3.1](./DESIGN_PLAN.md)、[AGENTS.md §4](../AGENTS.md) 与 [ANDROID_SYLLABUS.md](./ANDROID_SYLLABUS.md) 改为**不可变语义 ID**（如 `android.handler-epoll`），Slug 自动剥离 `NN-` 派生并支持 `aliases[]`，序号仅作展示动态计算 |
| **P1-3** | `localStorage` 单点脆弱性（iOS ITP 清除） | iOS Safari ITP 7 天不访问可能清理脚本存储；清除网站数据即丢全部笔记 | 在 [DESIGN_PLAN.md §6.2](./DESIGN_PLAN.md) 增加 `navigator.storage.persist()`、**PWA Manifest**（添加到主屏幕免 ITP 驱逐）、`上次备份 N 天前`提醒、文件与**剪贴板**双向导出导入及合并/覆盖预览 |
| **P1-4** | 大纲存在明显知识断层 | 缺少网络协议基础（TCP/TLS/HTTP3/HttpDNS）、缺少 `ClassLoader`/热修复、Compose 仅 1 题偏弱 | 在 [ANDROID_SYLLABUS.md](./ANDROID_SYLLABUS.md) 新增 `06-01 网络协议与传输基础`（3 题）、`03-04 类加载机制与热修复原理`（2 题），将 Compose 升格为独立 L2 `05-02`（4 题），并合并冗余旧题 |
| **P1-5** | 13 个手写交互 SVG 范围失控与手机可读性风险 | 800 宽 `viewBox` 在 360px 手机下文字缩至 ~5px；单人维护 13 个特制动画成本过高 | 在 [DESIGN_PLAN.md §4.2 & §7.2](./DESIGN_PLAN.md) 抽象统一 SVG 原语套件与步骤文本外置 HTML (`aria-live`)；移动端保证有效渲染字号 `>= 12px`；**Stage 2B 聚焦交付 5 个核心旗舰交互 SVG**，其余先使用 Mermaid 并按需升级 |
| **P1-6** | 重新部署后老标签页切题出现 Chunk 404 | 新构建改写产物 Hash 后，未刷新的旧标签页异步拉取旧题目报错崩溃 | 在 [DESIGN_PLAN.md §3.3 & §8](./DESIGN_PLAN.md) 接入 `vite:preloadError` + `router.onError` 防死循环单次重载兜底，VPS 部署保留历史 `assets/` |
| **P1-7** | Mermaid 存在隐藏塌陷与竞态陷阱 | 在自测折叠状态渲染导致 `getBBox() == 0`；主题快速切换引发竞态报错与布局跳动 | 在 [DESIGN_PLAN.md §4.2](./DESIGN_PLAN.md) 明确 `startOnLoad: false`、`securityLevel: 'strict'`、`IntersectionObserver` + 展开双门控、保留源码触发重绘、全局串行队列及 `min-height` 骨架防 CLS |
| **P1-8** | 约 200 条参考外链缺乏真实性与有效性校验 | AI 批量编撰参考链接极易出现幻觉 URL 或死链，仅靠协议校验不够 | 在 [DESIGN_PLAN.md §4.2](./DESIGN_PLAN.md)、[AGENTS.md §2.3](../AGENTS.md) 与 [question-authoring](../.agents/skills/question-authoring/SKILL.md) 增加权威域名白名单、`verifiedAt` 字段及手动巡检脚本 `scripts/check-links.mjs` |

---

## 2. 次要问题与技术细节修正（P2 Minor · 18 项逐一落实）

1. **P2-1（图解与对比表章节约定冲突）**：更新 [AGENTS.md §4](../AGENTS.md)、`question-authoring` 与大纲表头，明确 `## 图解流程` 支持交互 SVG / Mermaid / CC-BY 官方图 / 结构化对比表，移除“Mermaid 全覆盖”误导表述。
2. **P2-2（Frontmatter 冗余与映射缺失）**：明确 `domain/category/subcategory/slug/order` 从目录路径自动派生；补充 `summary`、`priority`（`must-know` / `core` / `bonus`）和 `status`（`draft` / `published`）定义。
3. **P2-3（`domain.config.ts` Node/浏览器加载割裂）**：全面改用纯静态 JSON `_domain.json` + Zod 校验，插件自动扫描并注入 `virtual:question-manifest`，实现真正零改源码新增领域。
4. **P2-4（内联 SVG 与灯箱 `<defs>` ID 冲突）**：规定所有交互式 SVG 内 `<defs>` 统一采用 Vue 3.5 `useId()` 作用域隔离。
5. **P2-5（MiniSearch 中文分词噪音与序列化失真）**：提取前后端共用 `src/utils/tokenizer.ts`，加入 NFKC 归一化、中英文边界切分、CamelCase/缩写拆分、中文停用词，多词默认 `AND` 逻辑防单字泛洪。
6. **P2-6（Shiki 产物体积与个人笔记 XSS 防护）**：锁定 Shiki 仅在构建期运行并通过 CSS 变量切换双主题；用户个人笔记以安全纯文本展示，不向客户端打包 `markdown-it`。
7. **P2-7（虚拟模块开发期 HMR）**：补充 `configureServer` 对 `content/**` 增删改的监听与模块失效机制，以及开发弹层/生产阻断分级策略。
8. **P2-8（Zero-FOUC 脚本健壮性）**：独立 Key `interview-theme` + `try/catch` 包裹，同步刷新 `color-scheme` 与 `<meta name="theme-color">`，并说明 CSP 哈希兼容方案。
9. **P2-9（JSON 导入原型链污染防护）**：导入校验过滤 `__proto__`/`constructor`/`prototype`，按 Manifest 核对题目 ID 并限制文件与笔记体积。
10. **P2-10（部署 SPA 兜底与脚本）**：补充 GitHub Pages `404.html` 兜底、Vercel Rewrite、规划领域/404 路由与 `scripts/deploy.ps1` 一键发布计划。
11. **P2-11（国内字体加载防阻塞）**：移除 Google Fonts 外链，中文采用系统字体栈，西文/代码采用本地自托管子集 `.woff2`（`font-display: swap`）。
12. **P2-12（官方图卡补充）**：允许将 CC BY 4.0 协议的 Android Developers 官方图归档至本地，并在暗色模式放入护眼图卡中显示；三方博客截图维持引用外链模式。
13. **P2-13（移动端细节打磨）**：定义 `z-index` 层级栈、底部安全区留白、表格横向滚动包装、禁用横向划动切题手势；自测模式采用**折叠收起 + 关键词先导 + 答后自评按钮**替代 CSS `blur()`。
14. **P2-14（JS/SVG 动画减弱门控）**：补充 `usePrefersReducedMotion()` 响应式 Composable 控制步进与帧动画。
15. **P2-15（大纲技术细节纠偏）**：全部 9 处技术点已精准修正至 [ANDROID_SYLLABUS.md](./ANDROID_SYLLABUS.md)（Glide 4 `DATA/RESOURCE`、JDK 18 移除偏向锁与 ART `lock_word` 对比、Android 6.0 `pipe → eventfd`、Android 10–16 适配、R8 替代 AndResGuard、FD 设备差异、Binder `1MB - 8KB`、`oom_score_adj`、`TLAB`）。
16. **P2-16（大纲结构与校准）**：补齐 Navigation 题、压缩 `高频必考` 至 29.2%、移除易歧义的预勾选改为清晰编号 + 独立「候选扩展池」、补全屏幕适配/设计模式/泛型反射/Baseline Profiles/Bitmap 计算/`ApplicationExitInfo`/Hot100 模式题。
17. **P2-17（Windows 工具链与换行规范）**：升级建议为 `fnm` + **Node.js 24 LTS** + `npm i -g pnpm` 避开 Corepack `EPERM`，新增 `.gitattributes` 统一 LF，插件强制 POSIX 路径处理。
18. **P2-18（AI 框架文件一致性）**：对齐 `AGENTS.md`、`adversarial-review`、`question-authoring` 与 `domain-expansion` 中的停顿门禁、协议规范、区块语法与目录引用。

---

## 3. 采纳的进阶优化建议（P3）

- **增量 MVP 与全量 `draft` 占位**（Stage 2A/2B/2C 渐进交付，每批 L1 题库可随时抽检）；
- **轻量 Leitner「今日待复习」队列** 与多标签页 `storage` 事件同步；
- **参考卡片内置 `developer.android.com` ↔ `developer.android.google.cn` 国内镜像切换**；
- **使用 `@panzoom/panzoom`（`touch-action: none`）驱动图解灯箱**，共享响应式步骤状态；
- **组件化路由题纳入 AGP 8 `AsmClassVisitorFactory`**，候选扩展池纳入「项目深挖与 STAR 行为面试」。
