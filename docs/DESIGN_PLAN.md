# 个人技术面试复习站 — 架构设计与实施方案（Phase 1 · 对抗审核修订版）

> **文档状态**：已完成 `claude-opus-5-5-high` Gate 1 对抗审核并完成修订，**等待用户最终审阅确认**  
> **需求基线**：[个人建站需求.txt](../个人建站需求.txt)  
> **审核档案**：[ADVERSARIAL_REVIEW_PLAN.md](./ADVERSARIAL_REVIEW_PLAN.md)  
> **一期目标**：面向 Android 中级开发工程师的系统化面试知识库，架构上原生支持未来拓展至前端、后端、运维、网安等技术领域。

---

## 1. 需求拆解与架构选型评估（纯前端静态 vs 后端管理题库）

在 [个人建站需求.txt](../个人建站需求.txt) 中，你提到：*"不是经常需要通过手动操作更新的题库，以后增加题库重新更新前端部分发布上去就行了，所以就没觉得用后端来管理题库。这部分你可以说说你的看法。"*

### 1.1 明确结论：强烈建议采用「纯前端 + 静态内容驱动（Git-as-CMS）」

对于个人使用的技术面试题库，**不建后端、采用纯前端静态方案是最优工程决策**，理由如下：

| 对比维度 | 纯前端 + Git Markdown（推荐） | 自建后端 + 数据库 + 管理后台（不推荐） |
| :--- | :--- | :--- |
| **更新与维护成本** | 新增题目只需在 `content/` 下新建 `.md` 文件并执行一键发布脚本；天然享受 Git Diff 审查与 AI 批量出题 | 需要维护后端服务（Node/Java/Go）、数据库、后台登录鉴权、富文本编辑器与接口联调 |
| **部署与运维负担** | 构建产物为纯静态 `dist/`，可直接托管于个人 VPS Nginx、Cloudflare Pages、GitHub Pages 或 Vercel，零数据库备份与安全漏洞烦恼 | 需持续运维进程守护、数据库备份、HTTPS 与后台接口防暴破 |
| **首屏性能与稳定性** | 通过构建期索引 + 按题懒加载，静态分发毫秒级响应，配合 PWA Manifest 可离线/添加到手机桌面稳定复习 | 首屏依赖 API 往返；服务器重启或数据库异常直接影响复习 |
| **个人学习记录（进度/笔记）** | 使用浏览器 `localStorage`（Pinia 持久化）存储掌握状态、收藏与笔记，配合 **JSON 文件导出/导入**、**剪贴板跨端导入导出**及 **PWA 免驱逐**防丢失 | 虽支持天然跨端云同步，但为单一用户维护一套账号密码体系投入产出比极低 |
| **未来领域拓展** | 仅需在 `content/<domain>/` 新建目录并放置 `_domain.json`，核心 UI/搜索/进度/路由代码零修改自动识别 | 每次新增领域字段（如拓扑图、命令行清单）都要同步改表结构与管理表单 |

### 1.2 什么时候才需要考虑引入后端 / 轻量同步？
仅当未来出现以下**明确痛点**时才值得演进（当前架构将存储层抽象为可替换 Adapter，无需推翻重来）：
1. 需要高频在手机与多台电脑之间**实时无感自动同步**复习进度与笔记（届时也优先接入 GitHub Gist / Cloudflare KV / Supabase 等轻量 Serverless 存储，而非重型后台）；
2. 计划将题库开放给他人注册刷题、统计排行榜或进行付费权限控制。

---

## 2. 技术栈与工程化选型

结合你指定的 **Vue / TypeScript** 生态与静态内容驱动需求，技术栈选型如下：

| 层级 | 选型 | 选型依据 |
| :--- | :--- | :--- |
| **核心框架** | **Vue 3.5+**（`<script setup lang="ts">` + `useId()` + Composition API） | 组合式函数（Composables）天然适合抽离主题、搜索、降级动效与学习状态逻辑 |
| **类型系统** | **TypeScript 5.x**（Strict Mode + `vue-tsc --noEmit`） | 严格约束领域配置、Frontmatter、区块结构（Blocks）与学习状态数据 |
| **构建工具** | **Vite 6.x** + 自定义内容构建插件（POSIX 路径规范化） | 负责构建期扫描 Markdown、Shiki 代码高亮、Zod 校验、生成虚拟模块及按题分块懒加载 |
| **路由方案** | **Vue Router 4.x** | 基于 `import.meta.env.BASE_URL` 适配子路径，含 `scrollBehavior`、规划领域占位页与 404 兜底 |
| **状态管理** | **Pinia** | 管理学习状态、收藏、纯文本笔记与自测展开记忆，含跨标签页 `storage` 同步与安全 JSON 迁移 |
| **样式系统** | **Tailwind CSS v4** + CSS 语义变量 | 显式声明 `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));`，结合 `@tailwindcss/typography`（`dark:prose-invert`） |
| **Markdown 与高亮** | **markdown-it**（`html: false`） + **Shiki**（仅构建期运行） | 构建期完成代码高亮（`themes: { light, dark }`, `defaultColor: false` 走 CSS 变量），不把 Shiki 打入客户端包，禁用原始 HTML 杜绝 XSS |
| **数据校验** | **Zod** | 开发与构建期强校验 `_domain.json`、`_category.json`、Frontmatter 及外部引用 URL 白名单 |
| **全站检索** | **MiniSearch**（`src/utils/tokenizer.ts` 前后端共享） | 零后端实现亚毫秒级中英文 + CamelCase 混合检索与高亮映射 |
| **图表引擎** | **交互 SVG 组件套件** + **Mermaid（按需动态导入）** + **@panzoom/panzoom** | 核心原理图用响应式 SVG 套件；Mermaid 仅在可见且展开时串行渲染；全图支持触控安全缩放灯箱 |
| **图标与测试** | **lucide-vue-next** + **Vitest** | 统一工程图标；针对分词器、Schema 校验、JSON 导入安全与 Store 编写单元测试 |

### Windows 开发环境前置说明（Phase 2 前准备）
在当前 Windows 工作机中已检测到 `git 2.46.0`、`Python 3.12.10` 与 `winget`，尚未检测到 Node.js。基于 2026-11 的生态现状与 Windows 权限最佳实践：
- 建议使用 **`fnm`** 安装用户目录级 **Node.js 24 LTS**（规避管理员权限 `Program Files` 下 `corepack enable` 触发 `EPERM` 及 PowerShell 执行策略拦截 `.ps1` 问题），并执行 `npm i -g pnpm`。
- Phase 2 初始化工程时将同时锁定 `.nvmrc`、`package.json` 的 `packageManager` 与 `engines` 字段，并已配置 `.gitattributes`（`* text=auto eol=lf`）与 `.editorconfig` 保持一致。

---

## 3. 多领域可扩展架构与静态内容管线

为确保未来拓展**前端、后端、运维、网络安全**时无需修改核心源码，系统采用 **Zero-Code-Edit Domain Discovery（零代码修改领域自发现）** 架构：

### 3.1 目录分层与不可变语义 ID 约定
```text
content/
├── android/                          # 一期：Android 中级开发（status: active）
│   ├── _domain.json                  # 领域元信息、Light/Dark 主题色 Token、图标
│   ├── 01-kotlin-java-core/          # 一级分类（NN- 前缀控制展示排序，不写入 ID）
│   │   ├── _category.json            # L1 名称、简介、图标
│   │   ├── 01-coroutines-flow/       # 二级专题
│   │   │   ├── _category.json        # L2 名称、简介
│   │   │   ├── 01-suspend-cps.md     # 具体面试题（slug 自动派生为 suspend-cps）
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── frontend/_domain.json             # 远期预留（status: planned）
├── backend/_domain.json
├── devops/_domain.json
└── security/_domain.json
```
- **不可变语义 ID（Immutable Semantic ID）**：题目 Frontmatter 中的 `id` 采用稳定语义标识（如 `android.handler-epoll`），**严禁使用依赖位置的编号（如 `A-03-01`）**。后续增删题目或调整章节顺序时，展示序号（`01`, `02`）由构建器根据目录与文件 `NN-` 前缀自动计算，`localStorage` 中的学习进度、收藏与笔记**永远不会因调序而孤立失效**。
- **URL Slug 与兼容别名**：URL `slug` 由插件将文件路径标准化为 POSIX（`\` → `/`）后剥离 `NN-` 前缀自动派生（排除 `_*.md` 与 `README.md`），并支持可选 `aliases: string[]` 兼容历史链接重定向；构建期通过 Zod 强制校验同领域内 `id` 与 `slug` 唯一性。

### 3.2 构建期 Markdown → Vue 渲染边界（`.md?compiled` 区块协议）
直接对编译后的整段 HTML 使用 `v-html` 无法挂载交互式 Vue SVG 组件，也难以可靠隔离 Mermaid 容器。因此，Vite 插件 `plugins/questionBankPlugin.ts` 采用**结构化区块（Typed Blocks）编译协议**：
1. **构建期分块解析**：
   - 使用自定义块解析 + `markdown-it`（`html: false`）+ 构建期初始化的单例 Shiki 高亮器（仅加载 `kotlin/java/xml/groovy/kts/shell/json/yaml/markdown` 语法，输出 CSS 变量双主题类，**Shiki 本身绝不打入前端 Bundle**）。
   - 将正文拆分为严格有序的区块数组并输出为独立 JS 模块（`.md?compiled`）：
     ```ts
     export type QuestionBlock =
       | { type: 'html'; html: string }
       | { type: 'diagram'; name: string }
       | { type: 'mermaid'; code: string }
     ```
   - 同时提取小节目录（`toc`）与精简摘要供导航和搜索使用；若 `:::diagram <Name>` 引用了不存在的组件，**在构建期直接报错阻断**。
2. **前端按需渲染（`QuestionBody.vue`）**：
   - 遍历 `blocks`：普通文本走 `v-html`（已由 `html: false` 保障无 XSS 注入风险）；表格自动包裹可横向滚动容器；`diagram` 区块通过 `import.meta.glob('/src/components/diagrams/**/*.vue')` + `defineAsyncComponent` 懒加载对应交互式 SVG；`mermaid` 区块交由懒加载 `<MermaidBlock :code="block.code" />` 渲染。
3. **Dev HMR 与虚拟模块增量更新**：
   - 插件在 `configureServer` 中监听 `content/**` 的 `add` / `unlink` / `change` 事件，当新增/删除题库文件或编辑 `_domain.json` / `_category.json` 时自动失效 `virtual:question-manifest` 与 `virtual:search-index`。
   - 开发模式下校验失败通过 Vite Error Overlay 提示但不崩溃服务；生产构建（`vite build`）遇到任何 Zod/校验错误则严格失败退出。
4. **远期多领域零改代码接入**：
   - 浏览器侧 `src/domains/registry.ts` 直接读取 `virtual:question-manifest` 自动暴露的 `_domain.json` 列表并注入 `--domain-accent` 语义色令牌，拓展新领域无需修改任何核心源码。

### 3.3 发布防断层（Stale Chunk Protection）
由于每道题按需异步加载（Code Splitting），静态站点重新部署后老标签页继续点击未访问题目可能触发动态加载旧 Hash 失败：
- 客户端监听 `window.addEventListener('vite:preloadError', ...)` 与 `router.onError`，通过 `sessionStorage` 标志位保护执行**单次静默重载恢复**（防止死循环），若仍失败则提示手动刷新；
- VPS 部署规范中保留上一版本 `assets/` 产物（或采用原子软链保留最近 N 个版本），保证正在复习中的手机标签页不会中途报错。

### 3.4 中英文 + CamelCase 混合搜索引擎（`src/utils/tokenizer.ts`）
针对中文面试关键词、英文 API 与混合查询（如 `"Handler内存泄漏"`、`"OkHttp"`、`"HTTP2"`、`"事件分发"`）：
- **构建期与客户端共享同一分词器**：构建插件与前端 `MiniSearch.loadJSON(..., { tokenize, processTerm })` 复用同一个 `src/utils/tokenizer.ts`（因为函数无法序列化进 JSON），并编写全面单元测试覆盖边界。
- **分词规则**：
  1. 对查询与文本执行 `NFKC` 归一化（兼容全角字符）；
  2. 在中英文/数字字符边界自动切分（如 `Handler内存泄漏` → `Handler` + `内存泄漏`）；
  3. 英文按 CamelCase / 缩写词边界拆词（如 `OkHttp` → `okhttp` / `ok` / `http`，`XMLParser` → `xml` / `parser`，`HTTP2` → `http` / `2`）；
  4. 中文（`\u4e00-\u9fff`）生成**二元组（Bigram）**为主、配合轻量中文停用词表（过滤 `的/了/在/是/和/与/中/对`）控制单字噪音；**单字查询**才回退到单字匹配；
  5. 多词查询默认采用 **`combineWith: 'AND'`**（避免输入 `"内存泄漏"` 时被 `"内"` 字的 OR 匹配淹没），若无精确命中则优雅降级提示；并支持高亮映射回原文本；
  6. 当全站题量未来超过 300 题时，可按领域切分搜索索引 Chunk 按需拉取，正文摘录索引截断至前 400 字控制体积。

---

## 4. 配图、流程图与权威参考策略（高保真、深浅色与合规平衡）

结合你在需求中提出的 *"最好搭配 android developer 或者很多简中的优质博客的配图，流程图来让我更好理解题目"*，本方案摒弃易失效、白底刺眼的第三方盗链做法，采用 **「五位一体」视觉与参考体系**：

### 4.1 严禁盗链三方博客图片
- 微信公众号（`mmbiz.qpic.cn`）、CSDN、知乎、掘金等均存在 Referer 防盗链、临时签名过期及版权风险，且白底截图在深色模式下视觉体验极差。构建插件将禁止在正文出现指向上述域名的外链 `<img>`。

### 4.2 合法且优雅的五位一体可视化方案
1. **分阶段交互式 SVG 核心原理图套件（Stage 2B 交付 5 个旗舰交互图）**：
   - 先抽象通用 **SVG 图表原语套件**（`DiagramShell`、`DiagramNode`、`DiagramEdge`、`DiagramLane`、`StepController` + `useDiagramSteps`）：
     - **移动端可读性优先**：采用竖向或紧凑 `viewBox` 布局，确保在 360px 手机宽度下实际渲染字号 **`>= 12px`**；步骤说明文字渲染在 SVG 下方结构化 HTML 卡片中（而非硬塞进狭小 SVG 图元），并通过 `aria-live="polite"` 播报步骤变化；
     - **作用域安全与减动效**：所有 `<defs>`（箭头/渐变）使用 Vue 3.5 `useId()` 隔离（避免页面与灯箱同时渲染导致 `url(#id)` 丢失）；所有 JS/rAF 步进动效通过 `usePrefersReducedMotion()` 严格受控。
   - **Stage 2B 首批 5 大旗舰交互 SVG**（其余题先以高质量 Mermaid 呈现，后续可渐进升级）：
     1. `Handler` / `Looper` / `MessageQueue` 与 Linux `pipe`/`eventfd` + `epoll` 休眠唤醒
     2. `Binder` 一次拷贝（`mmap` 内核/用户态空间映射）
     3. View 触摸事件分发 U 型链路与 `ACTION_CANCEL`
     4. `VSync` 信号、`Choreographer` 与双缓冲/三缓冲渲染流水线
     5. `OkHttp` 五大内置拦截器责任链与网络拦截器挂载点
2. **Mermaid 流程图（懒加载 + 防闪烁/防塌陷工程加固）**：
   - 初始化强制 `startOnLoad: false` 与 `securityLevel: 'strict'`；
   - **可见与展开双重门控**：配合 `IntersectionObserver` 且仅在自测答案展开状态下触发渲染，彻底避免在折叠/隐藏元素中调用导致 `getBBox()` 返回 `0`；
   - **原始源码保留与串行队列**：组件 `props` 始终持有原始 Mermaid 源码以便切换深浅色时安全重绘，所有 `mermaid.render()` 通过全局异步串行队列执行防止竞态报错，并预设 `min-height` 骨架占位消除布局抖动（CLS）。
3. **官方 CC BY 4.0 高清原图自托管（Figure Card）**：
   - Android Developers 官方文档配图采用 **CC BY 4.0** 协议授权。对于极少数信息密度极高的官方架构图（如 Activity 状态机 / CameraX / Jetpack 架构图），可下载归档至 `src/assets/figures/android/` 本地托管，附带官方来源署名，并在深色模式下放入**柔和浅色护眼图卡容器（Figure Card）**内展示，兼顾权威原图与夜间阅读舒适度。
4. **全端缩放平移灯箱（Diagram Lightbox）**：
   - 集成成熟的 `@panzoom/panzoom`（绑定 `touch-action: none`），点击任意 SVG、Mermaid 或官方配图即可全屏双指缩放与单指平移；打开交互式 SVG 灯箱时直接共享响应式步骤状态，而非暴力克隆 DOM。
5. **可校验权威外链参考卡片（带国内镜像切换）**：
   - `references[]` 仅允许 `https://` 协议及白名单权威域名（`developer.android.com`、`developer.android.google.cn`、`source.android.com`、`cs.android.com`、`kotlinlang.org`、`gityuan.com`、`hencoder.com`、`rengwuxian.com`、`tech.meituan.com`、`guolin.tech`、`square.github.io`、`bumptech.github.io`、`juejin.cn`），每条引用记录 `verifiedAt` 日期；
   - 卡片支持一键切换 `developer.android.com` ↔ **`developer.android.google.cn`** 国内直连镜像；并提供独立 `pnpm check:links` 脚本定期巡检外链连通性（不阻塞离线构建）。

---

## 5. 题目深度校准与展示规范（中级 Android 标准）

严格对齐需求：*"按 android 中级工程师需要掌握的内容来写题和对应参考答案，主要给思路，原理解析，具体内容给个关键词带过就行。"*

- **五段式固定骨架**：
  1. `## 面试答题思路`（30–60 秒口述骨架，先抛结论与分层视角）
  2. `## 核心原理解析`（拆解机制链路、数据结构、并发/内存边界与取舍对比；用**加粗关键词**代替代长篇源码粘贴）
  3. `## 图解流程`（支持：交互式 SVG / Mermaid 流程图 / 自托管 CC-BY 官方图 / 结构化对比表）
  4. `## 高频追问与关键词`（面试官连续追问点 + 关键词速记胶囊）
  5. `## 延伸参考`（官方文档与简中优质专栏引导）

---

## 6. UI/UX 审美、深浅色模式、移动端适配与动效设计

### 6.1 视觉定位与本土化无外网依赖字体
- **设计风格**：**Technical Editorial / Precision Engineering Notebook**——以高可读排版与克制的工程美感为核心。
- **零外部 CDN 字体方案**：不引用国内可能被阻断的 Google Fonts CDN（也不加载数 MB 的全量在线中文字体），中文使用系统原生高清晰字体栈（`"PingFang SC"`, `"Hiragino Sans GB"`, `"Microsoft YaHei"`, `"Noto Sans SC"`, `sans-serif`），西文与代码等宽字体采用本地自托管子集化 `.woff2`（`Plus Jakarta Sans` / `JetBrains Mono` subset，`font-display: swap`）。
- **色彩规范**：
  - 浅色（Warm Alabaster）：画布 `#FAFBF9` / 表面 `#FFFFFF` / 边框 `#E4E8E3` / 正文 `#18201B`
  - 深色（Obsidian Slate）：画布 `#0B0F14` / 表面 `#121820` / 边框 `#222B36` / 正文 `#E7EDF4`
  - 领域点缀色（`--domain-accent`）：Android `#0F9D58`（浅）/ `#34D399`（深）；其余规划领域各持独立蓝/琥珀/青/玫红语义色。

### 6.2 零闪烁深浅色与 PWA 持久化防丢
- **Zero-FOUC 初始化脚本**：置于 `index.html` `<head>` 最顶端，使用独立 Key `interview-theme`（与 Pinia 业务数据解耦），外包 `try/catch` 兼容隐私模式，首帧前同步设置 `<html data-theme>`、`style.colorScheme` 与 `<meta name="theme-color">`（若后续开启 CSP，采用脚本 `sha256` 哈希放行）。
- **抗 ITP 数据防丢策略**：
  1. 首次持久化写入时尝试调用 `navigator.storage?.persist?.()`；
  2. 提供轻量 `manifest.webmanifest` 与图标支持移动端 **添加到主屏幕（PWA）**，绕过 iOS Safari 7 天未访问清理脚本存储（ITP）机制；
  3. 界面提供`上次备份 N 天前`轻量提醒，支持**导出 `.json` 文件**与**一键复制到剪贴板**（方便微信/备忘录跨端同步），同时监听 `storage` 事件实现多标签页状态同步；
  4. **JSON 导入安全防护**：使用 Zod 校验且严格过滤 `__proto__`/`constructor`/`prototype` 污染键，按 Manifest ID 核对有效性并展示“合并 / 覆盖”预览弹窗及失效旧 ID 报告，限制单文件 `<= 2MB` 与单条笔记长度上限；用户个人笔记以安全纯文本（`whitespace-pre-wrap`）渲染，不引入客户端 Markdown 解析风险。

### 6.3 三端响应式与移动端单手交互规范
- **层级与滚动锁（z-index 体系）**：明确定义 `bottom-bar (z-30)` < `bottom-sheet / drawer (z-40)` < `search-modal (z-50)` < `diagram-lightbox (z-60)`，打开遮罩层时执行 iOS 友好的背景滚动锁定；阅读正文底部预留 `calc(4.5rem + env(safe-area-inset-bottom))` 空间确保底栏不遮挡翻页按钮。
- **表格与冲突手势防护**：所有对比表格在 `< 768px` 下包裹 `.table-scroll-wrapper` 横向滚动容器（带边缘滚动提示）；**严禁使用左右滑动切题手势**，避免与代码块、表格及图表缩放平移冲突。
- **自测折叠/展开模式（替代 CSS `blur()`）**：
  - 开启“面试自测模式”时默认**折叠收起**答案正文与图解（不采用虚化滤镜，杜绝 `Ctrl+F` 透传泄题、GPU 渲染开销及 Mermaid 隐身渲染异常），并记住当前题目的展开状态；
  - 第一步可单独展开**关键词提示胶囊**，第二步点击展开完整答案；
  - 答案底部提供自评快捷按钮：**`流畅答出 → 已掌握` / `部分卡壳 → 需复习` / `尚不熟悉 → 需复习`**，形成完整“背—测—评”闭环；并支持基于 Leitner 错题复习队列的“今日待复习”筛选视图。

### 6.4 动效与无障碍约束
- 目录折叠、自测答案平滑展开、题间微过渡均采用轻量 GPU 属性动画，所有 SVG 交互步骤配有 HTML 说明与 `aria-live`；
- 在 CSS（`@media (prefers-reduced-motion: reduce)`）与 JS（`usePrefersReducedMotion()` 响应式 Composable）双重门控下，确保系统开启减弱动画时立即停止一切过渡与自动步进动画。

---

## 7. 完整工程目录与增量实施路线图（MVP → 完备）

### 7.1 工程目录结构
```text
personal-website/
├── .agents/skills/                   # Agent 协作技能（adversarial-review / question-authoring / domain-expansion）
├── content/                          # Git-as-CMS 静态题库（_domain.json + _category.json + *.md）
├── docs/                             # DESIGN_PLAN.md / ANDROID_SYLLABUS.md / 审核归档
├── plugins/
│   └── questionBankPlugin.ts         # POSIX 标准化、Zod 校验、Shiki 构建高亮、区块分包与索引生成
├── scripts/
│   ├── check-links.mjs               # 权威外链连通性巡检脚本（pnpm check:links）
│   └── deploy.ps1                    # 一键构建并发布至个人 VPS 脚本
├── public/
│   └── manifest.webmanifest          # PWA Manifest（移动端添加到桌面防 ITP 清除）
├── src/
│   ├── assets/
│   │   ├── figures/android/          # 自托管 CC BY 4.0 官方图
│   │   ├── fonts/                    # 子集化本地 woff2 字体
│   │   └── styles/                   # Tailwind v4 入口 + 深浅色/领域 CSS 变量
│   ├── components/
│   │   ├── common/                   # 搜索框、状态徽章、JSON 备份弹窗（合并/覆盖预览）
│   │   ├── diagrams/
│   │   │   ├── primitives/           # DiagramShell / Box / Arrow / Lane / StepController
│   │   │   ├── android/              # 旗舰交互式 SVG 组件（useId 隔离）
│   │   │   ├── MermaidBlock.vue      # 串行队列 + IntersectionObserver + strict 安全等级
│   │   │   └── DiagramLightbox.vue   # @panzoom/panzoom 缩放灯箱
│   │   ├── layout/                   # 顶栏、桌面目录树、平板抽屉、手机 BottomSheet + 底部单手栏
│   │   └── question/                 # QuestionBody 区块渲染器、自测折叠面板、参考卡片（含镜像切换）
│   ├── composables/                  # useTheme, useSearch, useHotkeys, usePrefersReducedMotion, useDiagramSteps
│   ├── domains/registry.ts           # 直接消费 virtual:question-manifest（新增领域零改代码）
│   ├── router/index.ts               # BASE_URL 自适应、planned 领域占位、404 与滚动恢复
│   ├── schemas/content.ts            # Zod 模型（Domain / Category / Question / StudyProgress）
│   ├── stores/studyStore.ts          # Pinia 持久化、跨页同步、防原型污染导入导出
│   ├── utils/tokenizer.ts            # 前后端共用中英文 + CamelCase 分词器
│   └── views/                        # HomeView, QuestionView, ReviewQueueView, MockDrillView, NotFoundView
└── tests/                            # Vitest（tokenizer, schema, import-security, store）
```

### 7.2 增量 MVP 实施节奏（用户批准大纲后启动）
1. **Stage 2A（MVP 核心骨架）**：初始化 Vite + Vue 3.5 + TS + Tailwind v4 + Pinia，完成 `questionBankPlugin.ts`、Zero-FOUC 主题、三端导航与阅读器、Shared `tokenizer` 搜索、以及全量大纲 `draft` 骨架占位，第一时间可运行预览。
2. **Stage 2B（交互增强与 5 大旗舰 SVG）**：落地 `DiagramShell` 套件与 5 个旗舰交互 SVG、懒加载 `MermaidBlock`、`DiagramLightbox`、自测折叠/自评闭环、JSON 导入导出预览与 PWA Manifest。
3. **Stage 2C（分批内容精编与用户抽检）**：按 L1 分类分批将 `draft` 升格为 `published` 完整五段式题解，每完成 2–3 个 L1 分类可随时抽检口吻与深度是否贴合个人习惯。
4. **Stage 2D（自动化验证与多端验收）**：运行 `vue-tsc --noEmit`、`vitest run`、`vite build`、`pnpm check:links` 与响应式/深浅色浏览器巡检。
5. **Stage 2E（Gate 2 对抗代码审查）**：调用 **`claude-opus-5-5-medium`**（若额度耗尽则切换至 `gemini-4-neon-high` 或 `gemini-4-argon-high` 并向用户说明）进行源码、XSS、移动端与技术准确度红队审查，修复全部 P0/P1 问题后正式交付。

---

## 8. 部署方案与一键发布流

- **个人 VPS（Nginx）**：提供 `scripts/deploy.ps1` 一键执行 `pnpm build` 并通过 `rsync`/`scp` 同步至 `/var/www/interview-prep/`（`assets/` 增量保留避免老标签页断链；`index.html` 与 `manifest.webmanifest` 配 `no-cache`，`assets/` 配 `immutable` 强缓存；Nginx 配置 `try_files $uri $uri/ /index.html;`）。
- **静态托管（GitHub Pages / Cloudflare Pages / Vercel）**：构建脚本自动生成 `404.html`（复制自 `index.html`）或配置 `vercel.json` Rewrite，支持通过环境变量 `VITE_BASE_PATH` 与 `VITE_ROUTER_MODE` 灵活适配任意子路径。
