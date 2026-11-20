# Gate 2 对抗性代码与题库审查归档（ADVERSARIAL REVIEW — CODE & CONTENT）

> **审查范围**：完整 Vue 3.5 + TypeScript + Tailwind CSS v4 应用代码（`plugins/`、`src/`、`index.html`、`vite.config.ts`、`scripts/`、`tests/`）、全量 5 个领域元数据与 111 道 Android 中级开发面试题。  
> **基准提交**：`c0b90dc`（含首次实机浏览器全检及 6 项视觉/Markdown 修复）  
> **审核执行模型与配额回退记录**：  
> - 按工作流优先切换审查员 `opus-reviewer` 至 `claude-opus-5-5-medium` 执行 Gate 2 红队审查；调用时触发平台 `RESOURCE_EXHAUSTED (429): Individual quota reached`。  
> - 严格遵循用户与 `GEMINI.md` / `AGENTS.md` 约定之配额回退策略，立即切换审查员至 **`gemini-4-neon-high`** 完成完整红队审计，并在此明确向用户透明披露模型切换原因。  
> **审定结论**：`PASS WITH REVISIONS`（0 `P0` Blocker / 10 `P1` Major / 8 `P2` Minor / 4 `P3` Suggestion）—— **所有 P0/P1 及全部高价值 P2 问题已在本轮悉数修复并重跑全量自动化验证通过。**

---

## 一、Gate 2 基准验收项（均已实测通过）

1. **需求与规范契约**：[个人建站需求.txt](../个人建站需求.txt) 自 `git init` 起保持 100% 未修改；目录结构与多领域扩展接口完全符合 [AGENTS.md](../AGENTS.md) 与 [DESIGN_PLAN.md](./DESIGN_PLAN.md)。
2. **安全与 XSS 防线**：`markdown-it` 配置 `html: false`；外链强制 `https://` 白名单校验并挂载 `noopener noreferrer`；个人笔记纯文本存储；JSON 导入内置原型链污染 key 过滤与 2MB/5000 字上限拦截；禁用第三方热链图；Zero-FOUC 脚本完整包裹 `try/catch` 并同步 `color-scheme` 与 `<meta name="theme-color">`。
3. **构建与分包边界**：Shiki 100% 仅在构建期运行，客户端 `dist/assets/` 含 0 个 Shiki 文件；Mermaid 与 KaTeX 依赖完全异步按需拆分；111 道题编译为 111 个独立按需 JS Chunk；产出 `dist/404.html` 静态 SPA 回退页。
4. **题库覆盖与质量**：5 个领域 `_domain.json`、10 个 L1、34 个 L2 与 **111 道已发布 Android 面试题** 100% 通过 Zod Schema 校验并与 [ANDROID_SYLLABUS.md](./ANDROID_SYLLABUS.md) 一一对应，含 5 张旗舰交互 SVG、66 张 Mermaid 流程图与 40 张对比表。

---

## 二、逐项问题排查与修复台账（P1 / P2 / P3）

### P0（Blocker）：0 项
无阻断性需求缺失、安全漏洞或崩溃问题。

### P1（Major）：10 项（已全部修复）

| 编号 | 问题描述与风险 | 涉及文件 | 实际修复措施与状态 |
| :--- | :--- | :--- | :--- |
| **P1-1** | 5 篇算法/图像处理文档存在 24 处未编译原始 LaTeX `$...$` 公式，页面直接展示 `$` 与反斜杠原文 | `01-algo-lru-cache.md`、`03-algo-view-tree-linkedlist.md`、`04-algo-hot100-patterns.md`、`01-image-blur-techniques.md`、`02-image-processing-apis.md`、`tests/content.spec.ts` | **已修复**：全部替换为清晰的行内代码或 Unicode 数学符号（`O(1)`、`O(log N)`、`M' = M × T`、`(2R+1)²`）；并在 `tests/content.spec.ts` 新增零残留 `$...$` 自动校验防止回退。 |
| **P1-2** | `DiagramShell` 全屏灯箱将步骤栏塞入 Panzoom 缩放容器内导致缩放后按钮移位/移动端吞触控；`MermaidBlock` 未隐藏行内 SVG 导致与灯箱 DOM ID 冲突 | `src/components/diagrams/DiagramLightbox.vue`、`src/components/diagrams/primitives/DiagramShell.vue`、`src/components/diagrams/MermaidBlock.vue` | **已修复**：在 `DiagramLightbox` 拆分独立 `#controls` 插槽置于缩放容器外；在 `MermaidBlock` 增加 `v-if="!lightboxOpen"` 挂载隔离，确保同一时刻仅存在单一 Mermaid SVG 实例。 |
| **P1-3** | 开启自测遮罩模式且未展开解析时，题干卡片下方的 `summary` 与右侧大纲栏 `compiled.toc` 依然可见，剧透核心答案与关键词 | `src/views/QuestionView.vue` | **已修复**：抽出 `isSelfTestCollapsed` 计算属性，在自测未展开状态下同步隐藏题干 `summary`、关键词标签条以及右侧桌面端大纲卡片。 |
| **P1-4** | `HomeView` 使用 `expandedL1Ids.size === 0 && index < 2` 回退逻辑，导致前两个 L1 模块无法同时被用户收起 | `src/views/HomeView.vue` | **已修复**：在切换 `domainManifest` 时显式用前 2 个 L1 ID 初始化 `expandedL1Ids`，彻底消除收起回弹缺陷。 |
| **P1-5** | `QuestionView` 快速切换存在异步加载竞态；`questionLoader` 会永久缓存失败 Promise；`PersonalNotes` 280ms 防抖期内切题会丢失输入并串写新题 | `src/views/QuestionView.vue`、`src/domains/questionLoader.ts`、`src/components/question/PersonalNotes.vue` | **已修复**：`QuestionView` 引入单调递增 `loadGen` 守卫；`questionLoader` 捕获异常后主动删除缓存键支持重试；`PersonalNotes` 切题与卸载前强制 `flushPendingSave()` 到旧 `dirtyQuestionId`，并监听 store 同步外部导入笔记。 |
| **P1-6** | `index.html` 中 `./favicon.svg` 与 `./manifest.webmanifest` 使用相对路径，在 `/android/<slug>` 等深层 SPA 路由刷新时 404 回退到 HTML | `index.html` | **已修复**：改为 `/favicon.svg` 与 `/manifest.webmanifest`，构建时自动随 `VITE_BASE_PATH` 正确改写。 |
| **P1-7** | `virtual:question-manifest` 冗余序列化双份题目对象与未使用 `references[]` 导致入口 JS 体积偏大；搜索索引 `storeFields` 与截断长度过冗余 | `plugins/questionBankPlugin.ts`、`src/types/interview.ts`、`src/domains/registry.ts`、`src/utils/tokenizer.ts` | **已修复**：Manifest 仅输出 `{ domains }` 并在客户端启动时单次构造 `questionsById`；从 `QuestionSummary` 移除未使用的 `references`；搜索索引 `storeFields` 精简为 `['domain', 'priority']`，`excerpt` 截断缩至 220 字符。 |
| **P1-8** | `MockDrillView`、`PlannedDomainView`、`HomeView` 收藏计数、路由及深色 `--domain-accent-fg` 存在硬编码 `'android'` 或固定绿色前景色问题 | `src/views/MockDrillView.vue`、`src/views/PlannedDomainView.vue`、`src/views/HomeView.vue`、`src/App.vue`、`src/router/index.ts` | **已修复**：`MockDrillView` 支持多激活领域与 `?domain=` 参数；`PlannedDomainView` 与 `router` 动态查找首个激活领域；`HomeView` 统计改为当前领域过滤后收藏/笔记数；`App.vue` 基于强调色 WCAG 相对亮度动态计算高对比度 `--domain-accent-fg`。 |
| **P1-9** | 手机窄屏下 5 张旗舰 SVG 随屏幕缩至小于 12px 可读底线；`BinderMmapSvg` 底部标签与垂直虚线箭头在 `x=528` 相交 | `src/components/diagrams/android/{HandlerLooper,BinderMmap,TouchDispatch,VsyncPipeline,OkHttpChain}Svg.vue` | **已修复**：5 张交互 SVG 统一设置 `min-w-[540px]`（灯箱内部覆盖 `min-width: 0` 自适应缩屏）并将 11px 标签提升至 `12px`；`BinderMmapSvg` 底部 `mmap 同页映射` 文案下移并居中到无遮挡区域（`y="284"`）。 |
| **P1-10** | `SearchModal` 无关键词下点选「核心常考」固定返回 0 条；缺 `bonus` 筛选与竞态守卫；4 个浮层直接互斥覆盖 `documentElement.style.overflow`；`MobileDrawer` 缺 `Esc` 关闭 | `src/composables/useScrollLock.ts`（新增）、`src/components/common/{SearchModal,BackupModal}.vue`、`src/components/layout/MobileDrawer.vue` | **已修复**：抽象引用计数 `useScrollLock` 统一托管 4 处滚动锁；`SearchModal` 修正空搜索下各梯度推荐列表、补充「中级加分」及 `searchGen` 防抖竞态守卫；`MobileDrawer` 支持 `Escape` 键关闭。 |

---

### P2（Minor）与 P3（Suggestion）整改汇总

| 编号 | 问题描述 | 处理状态与说明 |
| :--- | :--- | :--- |
| **P2-1** | Markdown 渲染器 `link_open` 允许了 `http://`，`image` 未拦截 `//...` 与 `data:` URI | **已修复**（`plugins/questionBankPlugin.ts` 仅允许 `#` 与 `https://`，并在图片规则一并拦截 `http://`、`https://`、`//`、`data:`）。 |
| **P2-2** | 并发加载虚拟模块时可能重编译 Shiki；缺全局 ID 唯一性与域名缀检查；围栏字符截断了长度；Dev 监听未防抖 | **已修复**（增加 `buildPromise` 并发复用、全局唯一 ID + `${domainId}.` 前缀校验、保留完整围栏长度及 80ms Dev HMR 防抖）。 |
| **P2-3** | 本地存储损坏时会在下次保存时静默覆盖；合并导入 `Date.parse` 未处理 `NaN` | **已修复**（`src/stores/studyStore.ts` 解析失败先隔离备份至 `interview-study-v1-corrupt-backup`，合并对比增加 `NaN` 守卫）。 |
| **P2-4** | `CategoryTree` 筛选无匹配时不隐藏空 L1；与 `HomeView` 待复习定义不完全一致；`HomeView` 缺空态引导 | **已修复**（两处统一纳入 `dueReviewIds`，隐藏空分类并加入引导复位空状态卡片）。 |
| **P2-5** | `deploy.ps1` 重复执行 `typecheck` 且缺 PowerShell `$LASTEXITCODE` 检查；`check-links.mjs` 未对 `404/5xx` 回退 `GET` | **已修复**（优化 `scripts/deploy.ps1` 错误中断校验与 `scripts/check-links.mjs` `GET` 重试逻辑）。 |
| **P2-6** | 部分参考外链不够精确或指向高变动子文档路径 | **已修复**（更新 `01-jvm-art-locking-jmm.md` 至 AOSP ART Runtime 主文档，`02-okhttp-connection-pool.md`、`03-okio-segment-buffer.md` 改为稳定的 OkHttp Features 与 Okio Recipes 文档；注：因受限网络无法直连 Google 域名，已同步通过域名白名单与路径语义审计）。 |
| **P2-7** | `QuestionBody` 未绑定 `:key="compiled.id"`；`/:domain/:slug` 缺规划中领域拦截；`scrollBehavior` 未尊重减弱动画偏好 | **已修复**（补充 `:key`、路由守卫及 `prefers-reduced-motion` 判断）。 |
| **P2-8** | `README.md` 与 `AGENTS.md` 文案仍遗留部分 Phase 1 描述，停用词表重复 `'与'`，`SearchModal` 含空插值 | **已修复**（更新文档至 Phase 2 完成态，清理停用词表与冗余模板表达式）。 |
| **P3 采纳** | 懒加载 `BackupModal`（**已采纳**于 `src/App.vue`）与 `HomeView` 标题条件省略号（**已采纳**）；对话框全焦点捕获可作为后续可访问性细化增强保留 | 已合理处理。 |

---

## 三、最终验证记录

在完成以上全部代码、测试与文档整改之后，最终重跑全套验证结果以终端实际输出为准（详见对话与提交历史）。
