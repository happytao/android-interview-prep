# 个人技术面试复习站 — 架构设计与实施方案（Phase 1）

> **文档状态**：待 `claude-opus-5-5-high` 对抗审核与用户审阅批准  
> **需求基线**：[个人建站需求.txt](../个人建站需求.txt)  
> **一期目标**：面向 Android 中级开发工程师的系统化面试知识库，架构上原生支持未来拓展至前端、后端、运维、网安等技术领域。

---

## 1. 需求拆解与架构选型评估（纯前端静态 vs 后端管理题库）

在 [个人建站需求.txt](../个人建站需求.txt) 中，你提到：*"不是经常需要通过手动操作更新的题库，以后增加题库重新更新前端部分发布上去就行了，所以就没觉得用后端来管理题库。这部分你可以说说你的看法。"*

### 1.1 明确结论：强烈建议采用「纯前端 + 静态内容驱动（Git-as-CMS）」

对于个人使用的技术面试题库，**不建后端、采用纯前端静态方案是最优工程决策**，理由如下：

| 对比维度 | 纯前端 + Git Markdown（推荐） | 自建后端 + 数据库 + 管理后台（不推荐） |
| :--- | :--- | :--- |
| **更新与维护成本** | 新增题目只需在 `content/` 下新建 `.md` 文件并推送构建；天然享受 Git 历史回溯、Diff 审查与 AI 批量辅助出题 | 需要维护后端服务（Node/Java/Go）、数据库、后台登录鉴权、富文本编辑器与接口联调 |
| **部署与运维负担** | 构建产物为纯静态 `dist/`，可直接托管于个人 VPS Nginx、Cloudflare Pages、GitHub Pages 或 Vercel，零数据库备份与安全漏洞烦恼 | 需持续运维进程守护、数据库备份、HTTPS 与后台接口防暴破 |
| **首屏性能与稳定性** | 通过构建期索引 + 按题懒加载，CDN/Nginx 静态分发毫秒级响应，断网环境下亦可扩展 PWA 离线缓存 | 首屏依赖 API 往返；服务器重启或数据库异常直接影响复习 |
| **个人学习记录（进度/笔记）** | 使用浏览器 `localStorage`（Pinia 持久化）存储掌握状态、收藏与个人笔记，并内置 **JSON 一键导出 / 导入备份**，换设备可随时迁移 | 虽支持天然跨端云同步，但为单一用户维护一套账号密码体系投入产出比极低 |
| **未来领域拓展** | 仅需在 `content/<domain>/` 新建目录并注册领域配置，核心 UI/搜索/进度系统零改造即可复用 | 每次新增领域字段（如代码示例、拓扑图）都要同步改表结构与管理表单 |

### 1.2 什么时候才需要考虑引入后端 / 轻量同步？
仅当未来出现以下**明确痛点**时才值得演进（且当前纯前端架构可通过抽象 `StorageAdapter` 接口平滑接入，无需推翻重来）：
1. 需要高频在手机与多台电脑之间**实时无感同步**复习进度与手写笔记（届时也优先考虑 GitHub Gist / Supabase / Cloudflare KV 等轻量 Serverless 存储，而非重型后台）；
2. 计划将题库开放给他人注册刷题、统计排行榜或进行付费权限控制。

---

## 2. 技术栈与工程化选型

结合你指定的 **Vue / TypeScript** 生态与静态内容驱动需求，技术栈选型如下：

| 层级 | 选型 | 选型依据 |
| :--- | :--- | :--- |
| **核心框架** | **Vue 3.5+**（`<script setup lang="ts">` + Composition API） | 组件抽象清晰、组合式函数（Composables）非常适合抽离主题、搜索、快捷键与学习状态逻辑 |
| **类型系统** | **TypeScript 5.x**（Strict Mode + `vue-tsc --noEmit`） | 严格约束领域配置、Frontmatter 元数据与学习状态结构 |
| **构建工具** | **Vite 6.x** + 自定义内容构建插件 | 支持构建期扫描 Markdown、生成虚拟模块（`virtual:*`）及按题粒度 Code Splitting |
| **路由方案** | **Vue Router 4.x** | 支持基于 `VITE_BASE_PATH` 与 `VITE_ROUTER_MODE`（History / Hash）适配 VPS 与静态托管子路径 |
| **状态管理** | **Pinia** | 管理学习状态（未学/需复习/已掌握）、收藏、自测模式开关与笔记，配合版本化 `localStorage` 迁移 |
| **样式系统** | **Tailwind CSS v4** + CSS 语义变量 | 结合 `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));` 实现精准深浅色与领域主题色切换 |
| **Markdown 与高亮** | **markdown-it**（`html: false`） + **Shiki** | 构建期/按需编译高质量代码块（支持 Kotlin/Java/XML/Shell 双主题高亮），禁用原始 HTML 杜绝 XSS |
| **数据校验** | **Zod** | 在开发和构建期强校验每一道题的 Frontmatter 与分类 `_category.json`，防止写错字段静默失效 |
| **全站检索** | **MiniSearch**（自定义中文分词器） | 零后端实现亚毫秒级中英文混合模糊检索与相关性排序 |
| **流程图引擎** | **自定义交互式 SVG 组件** + **Mermaid（按需动态导入）** | 核心原理图用主题原生交互 SVG；通用流程图用懒加载 Mermaid，保证首屏体积轻巧 |
| **图标与测试** | **lucide-vue-next** + **Vitest** | 统一线性工程图标体系；针对分词检索、内容 Schema 校验与状态持久化编写单元测试 |

### 环境前置检查说明
在当前 Windows 工作机环境中已检测到 `git 2.46.0`、`Python 3.12.10` 和 `winget`，**尚未检测到 `node` / `npm` / `pnpm`**。进入 Phase 2 实施前，需先安装 **Node.js 22 LTS**（例如 `winget install OpenJS.NodeJS.LTS` 或使用 `fnm`）并通过 `corepack enable` 启用 `pnpm`。

---

## 3. 多领域可扩展架构（一期 Android → 远期多学科）

为了确保未来拓展**前端、后端、运维、网络安全**时无需重构核心代码，系统采用 **Domain-Driven Content Registry（领域驱动内容注册表）** 架构：

### 3.1 目录分层约定
```text
content/
├── android/                          # 一期：Android 中级开发（status: active）
│   ├── domain.config.ts              # 领域元信息、品牌色 Token、图标
│   ├── 01-kotlin-java-core/          # 一级分类（数字前缀控制排序）
│   │   ├── _category.json            # L1 名称、简介、图标
│   │   ├── 01-coroutines-flow/       # 二级专题
│   │   │   ├── _category.json        # L2 名称、简介
│   │   │   ├── 01-suspend-cps.md     # 具体面试题
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── frontend/                         # 远期预留（status: planned）
│   └── domain.config.ts
├── backend/                          # 远期预留（status: planned）
│   └── domain.config.ts
├── devops/                           # 远期预留（status: planned）
│   └── domain.config.ts
└── security/                         # 远期预留（status: planned）
    └── domain.config.ts
```

### 3.2 主题色令牌隔离（CSS Custom Properties）
每个领域在 `domain.config.ts` 中定义自身的语义强调色（Light / Dark 两套适配对比度的色值），切换领域时在根容器动态注入 `--domain-accent`、`--domain-accent-soft`、`--domain-accent-fg`：
- **Android**（一期激活）：Jade Emerald `#0F9D58`（浅色）/ `#34D399`（深色）
- **Frontend**（规划中）：Cobalt Blue `#2563EB` / `#60A5FA`
- **Backend**（规划中）：Amber Copper `#D97706` / `#FBBF24`
- **Ops/DevOps**（规划中）：Teal Cyan `#0D9488` / `#2DD4BF`
- **Security**（规划中）：Crimson Rose `#E11D48` / `#FB7185`

### 3.3 构建期内容管线与按需懒加载（防止题库变大后首屏膨胀）
如果未来跨 5 个领域累计到 300–500 道题，绝不能把全部 Markdown 正文打进同一个 JS Bundle：
1. **构建期 Vite 插件（`plugins/questionBankPlugin.ts`）**：
   - 扫描 `content/**/_category.json` 与 `content/**/*.md`，通过 `gray-matter` 提取 YAML Frontmatter 并使用 `zod` 严格校验。
   - **安全规则**：若检测到非法 URL（非 `http(s)://`）、缺失必填字段、重复题目 `id` 或第三方面外链图片（如微信公众号/CSDN 防盗链图），在构建/测试阶段直接报错阻断。
   - 生成两个轻量级虚拟模块：
     - `virtual:question-manifest`：仅含 Domain → L1 → L2 树形结构与题目摘要（id、title、slug、difficulty、frequency、keywords、estimatedMinutes、diagram 标识），体积极小（百题约几十 KB）。
     - `virtual:search-index`：MiniSearch 序列化索引 JSON，按需在用户首次打开搜索框或空闲时（`requestIdleCallback`）加载初始化。
2. **正文按题懒加载**：
   - 前端通过 Vite `import.meta.glob('/content/**/*.md', { query: '?compiled', import: 'default' })`（或构建插件输出独立题目 Chunk）实现**访问某题才加载该题正文的编译 HTML 与参考资料**，保证即使题库扩展至上千题，首屏加载时间依然恒定。

### 3.4 中英文混合搜索引擎（MiniSearch Custom Tokenizer）
针对技术面试题典型查询场景（纯中文词如 `"事件分发"`、`"冷启动"`、`"内存泄漏"`，纯英文如 `"Handler"`、`"ViewModel"`、`"ANR"`，以及驼峰命名如 `"RecyclerView"`、`"OkHttp"`）：
- **自定义分词器**：
  - 英文与数字：按分隔符切词，并额外按 **CamelCase / PascalCase** 拆分（如 `RecyclerView` 拆出 `recyclerview`、`recycler`、`view`）。
  - 中文（CJK Unicode `\u4e00-\u9fff`）：同时生成 **二元组（Bigram）** 与 **单字（Unigram）** Token（例如 `"事件分发"` → `"事件"`、`"件分"`、`"分发"` + 单字），保证任意连续中文子串均可命中且长词匹配权重更高。
- **字段加权**：`title (3x)` > `keywords (2.5x)` > `subcategory/category (1.5x)` > `summary/bodyExcerpt (1x)`。
- **交互入口**：顶部搜索按钮 + 桌面端全局快捷键 `Ctrl/Cmd + K` 弹出 Command Palette 搜索弹窗，支持按当前领域或跨领域筛选、方向键选择与关键词高亮。

---

## 4. 配图、流程图与权威参考策略（规避外链失效与深浅色撕裂）

你在需求中提到：*"最好搭配 android developer 或者很多简中的优质博客的配图，流程图来让我更好理解题目。"*

### 4.1 为什么不能直接盗链/拷贝三方博客图片？
1. **防盗链失效**：微信公众号（`mmbiz.qpic.cn`）、知乎、掘金、CSDN 普遍开启 Referer 校验或临时签名，上线后静态站直接引用会大面积显示裂图。
2. **深色模式灾难**：三方博客截图几乎都是白底黑字 PNG，在深色模式下会形成刺眼的大白块，且手机竖屏下字号极小难以阅读。
3. **版权与稳定性**：外链博客删文或改版会导致配图消失。

### 4.2 本项目采用的「四位一体」高质量图解策略
1. **核心机制交互式 SVG 组件（一期精选约 12–15 个高频核心机制）**：
   由前端团队手写主题原生、矢量无损的 Vue SVG 组件（随深浅色 CSS 变量自动切换配色），支持**步骤高亮 / 动画流转演示**（如点击“下一步”观察消息如何进入 `MessageQueue` 或触摸事件如何经历 U 型传递）：
   - Activity 启动与交错生命周期时序图
   - App 冷启动全链路（Launcher → AMS → Zygote → ActivityThread → 首帧）
   - Handler / Looper / MessageQueue + Linux `epoll` 休眠唤醒图
   - Binder IPC 一次拷贝（`mmap` 内核/用户态空间映射图）
   - View 事件分发 U 型传递与拦截取消流向图
   - View Measure / Layout / Draw 与 VSync 帧刷新渲染管线
   - RecyclerView 四级缓存取放流转图
   - Kotlin 协程 `suspend` CPS 状态机流转图
   - `ViewModel` 跨配置变更存活（`NonConfigurationInstances`）架构图
   - OkHttp 五大核心拦截器责任链图
   - Glide 生命周期绑定与三级缓存读写流程图
   - Android 内存模型与 LeakCanary `WeakReference + ReferenceQueue` 检测闭环图
   - APK 打包编译与签名链路图（AAPT2 → D8/R8 → Zipalign → apksigner）
2. **Mermaid 流程图（覆盖其余专题与复杂时序/状态机）**：
   - 在 Markdown 中直接编写 `mermaid` 代码块（流程图 `flowchart`、时序图 `sequenceDiagram`、状态图 `stateDiagram-v2`）。
   - **工程化防坑要点**：
     - 仅在题目含 Mermaid 块时动态 `import('mermaid')`，绝不拖慢首屏加载；
     - 监听 `data-theme` 变化，切换深浅色时自动销毁重建 SVG 并注入匹配的 themeVariables；
     - 每次渲染生成全局递增唯一 DOM ID，避免快速切题时产生 ID 冲突。
3. **移动端与桌面端通用「图表灯箱（Diagram Lightbox）」**：
   - 点击或轻触任意 SVG / Mermaid 图表，可弹出全屏高对比度视图，支持双指/按钮缩放与拖拽平移，彻底解决手机端看复杂架构图字小看不清的痛点。
4. **精选权威外链参考卡片**：
   - 每道题底部的 `## 延伸参考` 与 Frontmatter `references` 会结构化展示经过甄别的权威来源链接：
     - **官方一手文档**：`developer.android.com`（官方文档常自带高质量矢量架构图与源码解释）
     - **简中深度专栏**：Gityuan（Android 系统源码）、HenCoder / 扔物线（View 与协程）、郭霖（Jetpack / 源码）、美团技术团队 / 字节跳动技术团队（性能优化与稳定性实战）。
   - 让你可以“站内 3 分钟看懂原理图解与思路 + 一键跳转原汁原味官方/名家深挖博客”。

---

## 5. 题目内容校准与展示结构（中级 Android 标准）

严格落实需求：*"按 android 中级工程师需要掌握的内容来写题和对应参考答案，主要给思路，原理解析，具体内容给个关键词带过就行。"*

### 5.1 难度与深度校准原则
- **目标画像**：2–5 年经验的 Android 中级开发工程师（熟悉日常业务开发，重点考察对核心机制底层原理、多线程/内存/UI 渲染/网络架构及常见线上稳定性问题的理解与权衡）。
- **不过度堆砌代码**：不贴大段业务代码或整屏源码，用 **加粗关键词 + 核心调用链** 替代冗余实现细节。
- **固定五段式答题结构**：
  1. **面试答题思路（30 秒骨架）**：面试官最想听到的 3–4 个分层结论，先给总览再展开。
  2. **核心原理解析（深度与权衡）**：聚焦因果链、关键数据结构、并发/内存边界与方案对比。
  3. **图解流程（可视化锚点）**：内嵌交互式 SVG 原理图或 Mermaid 时序/流程图。
  4. **高频追问与关键词速记**：列出面试官二连问/三连问方向，以及考前扫一眼就能想起的**核心关键词胶囊**。
  5. **延伸参考**：官方 Android Developers 与简中优质博客链接。

---

## 6. UI/UX 审美、深浅色模式、移动端适配与动效设计

### 6.1 视觉风格定位：Technical Editorial / Precision Engineering Notebook
- **设计气质**：摆脱廉价“题库列表”观感，打造兼具**技术刊物阅读质感**与**IDE 工程师笔记效率**的现代静态站。
- **字体排版**：
  - 西文/数字：`Plus Jakarta Sans` + 系统兜底（等宽代码/编号使用 `JetBrains Mono`）
  - 中文：`Noto Sans SC` / `PingFang SC` / `Microsoft YaHei`
  - 正文阅读宽度严格限定 `max-w-[74ch]`，行高 `1.75`，确保长篇原理解析不累眼。
- **色彩体系（高对比度、低视觉疲劳）**：
  - **浅色模式（Warm Alabaster Paper）**：画布 `#FAFBF9`、卡片 `#FFFFFF`、边框 `#E4E8E3`、主文本 `#18201B`、次文本 `#526057`
  - **深色模式（Obsidian Technical Slate）**：画布 `#0B0F14`、卡片 `#121820`、边框 `#222B36`、主文本 `#E7EDF4`、次文本 `#94A3B8`
  - **语义徽章**：高频必考（琥珀金）、核心常考（领域主题绿）、中级加分（靛青）；掌握状态（未学灰 / 需复习橙 / 已掌握翠绿）。

### 6.2 零闪烁深浅色引擎（Zero-FOUC）
- 在 `index.html` `<head>` 最顶部嵌入极简同步脚本：读取 `localStorage.getItem('theme-preference')`（`light | dark | system`），在首帧渲染前即向 `<html>` 写入 `data-theme="dark" | "light"`，彻底避免暗色环境下刷新白屏闪烁。
- 右上角提供三态切换开关（浅色 / 深色 / 跟随系统），并实时监听 `prefers-color-scheme` 系统切换。

### 6.3 全端响应式布局规范
- **桌面端（`>= 1024px`）**：三栏工程工作台
  - 顶部吸顶导航栏：站点 Logo + 领域切换器（Android 激活 + 前端/后端/运维/网安路线图入口） + `Ctrl+K` 搜索触发器 + 模拟抽题入口 + 主题切换；
  - 左侧可折叠目录树：L1 → L2 → 题目列表，带各分类掌握进度百分比条；
  - 中央阅读区：题目标签头 + 五段式答案 + 图表 + 底部“上一题 / 下一题”与状态标记栏；
  - 右侧轻量辅助栏：当前题目小节大纲（TOC）+ 关键词速览 + 学习进度微卡。
- **平板端（`768px–1023px`）**：左侧目录转为滑出式抽屉（Drawer），阅读区居中占满，保证充足阅读空间。
- **移动端（`< 768px`）**：专为单手通勤刷题优化
  - 精简吸顶顶栏（返回首页 / 搜索按钮 / 主题切换）；
  - 顶部阅读进度条（随滚动平滑推进）；
  - 触控友好的**底部抽屉目录（Bottom Sheet）**，支持 L1/L2 折叠展开；
  - **单手悬浮底栏（Sticky Bottom Action Bar）**：`目录` · `上一题` · `自测遮罩` · `标记掌握` · `下一题`，所有按钮触控热区 `>= 44x44px`，适配刘海/全面屏安全区（`env(safe-area-inset-bottom)`）。

### 6.4 面向真实刷题痛点的交互功能
1. **面试自测遮罩模式（Self-Test Mode）**：
   - 开启后仅显示题干、难度标签与分类；
   - 第一步可点击**“显示关键词提示”**（仅揭示 `keywords` 胶囊，逼迫自己串联思路）；
   - 第二步点击**“展开完整解析”**，对照核心原理解析与图解查漏补缺。
2. **个人学习进度管理与随机模拟抽题**：
   - 每题支持标记：`未学` / `需复习` / `已掌握` + `星标收藏` + `个人 Markdown/纯文本备注`。
   - **随机抽题 / 专项模拟模式**：可限定“仅从高频必考题 / 需复习题目 / 某几个 L1 分类”中随机抽取一题进行口述演练。
   - **数据安全备份**：设置面板提供一键导出 `.json` 进度备份与导入恢复功能（含 Zod 校验防止损坏数据导入）。

### 6.5 克制而高级的动效系统（Motion Design）
- 列表与目录展开/收起采用 GPU 友好的柔和过渡动画；
- 切题阅读区采用微距淡入滑入（`150ms–200ms cubic-bezier(0.22, 1, 0.36, 1)`）；
- 交互式 SVG 原理图采用路径高亮脉冲与步骤切换过渡，引导视线跟随数据/消息流向；
- 掌握度环形进度条与分类统计条带有平滑数值/宽度渐变；
- **无障碍硬性约束**：在全局 CSS 中声明 `@media (prefers-reduced-motion: reduce)`，关闭非必要过渡与 SVG 循环动画。

---

## 7. 完整工程目录规划（Phase 2 实施蓝图）

```text
personal-website/
├── .agents/skills/                   # Agent 协作技能（已就绪）
├── content/                          # Git-as-CMS 静态题库根目录
│   ├── android/                      # 一期激活领域
│   │   ├── domain.config.ts
│   │   ├── 01-kotlin-java-core/ ... 09-algorithm-scenarios/
│   ├── frontend/domain.config.ts     # 远期规划占位
│   ├── backend/domain.config.ts
│   ├── devops/domain.config.ts
│   └── security/domain.config.ts
├── docs/                             # 设计方案、知识大纲与对抗审计日志
├── plugins/
│   └── questionBankPlugin.ts         # Vite 构建期 Markdown 扫描、Zod 校验与索引生成插件
├── src/
│   ├── assets/styles/                # Tailwind v4 入口、深浅色与领域 CSS 变量
│   ├── components/
│   │   ├── common/                   # 搜索弹窗、进度环、状态徽章、JSON 备份弹窗
│   │   ├── diagrams/                 # 主题自适应交互式 SVG + Mermaid 懒加载容器 + 灯箱
│   │   ├── layout/                   # 顶栏、侧边目录树、移动端 BottomSheet 与底部单手栏
│   │   └── question/                 # 五段式正文渲染、自测遮罩、关键词胶囊、参考外链卡片
│   ├── composables/                  # useTheme, useSearch, useHotkeys, useBreakpoint
│   ├── domains/registry.ts           # 多领域统一注册中心
│   ├── router/index.ts               # 路由配置（/:domain?, /:domain/:questionSlug）
│   ├── schemas/content.ts            # Zod 数据校验模型
│   ├── stores/studyStore.ts          # Pinia 学习进度、笔记与自测状态管理
│   ├── types/interview.ts            # TypeScript 领域与题目核心类型
│   ├── utils/tokenizer.ts            # 中英文 + CamelCase 混合分词器
│   └── views/                        # HomeView（知识地图）, QuestionView（阅读刷题）, MockDrillView
├── tests/                            # Vitest 单元测试（分词、Schema、Store 导入导出）
├── index.html                        # 含 Zero-FOUC 内联主题初始化脚本
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 8. 数据模型与部署方案

### 8.1 核心 TypeScript / Zod 数据契约
- `DomainConfig`: `id`, `name`, `tagline`, `status ('active' | 'planned')`, `order`, `icon`, `accent: { light: string; dark: string }`
- `QuestionMeta`: `id`, `slug`, `title`, `domain`, `category`, `subcategory`, `difficulty ('basic' | 'medium' | 'hard')`, `frequency (1..5)`, `estimatedMinutes`, `keywords: string[]`, `diagram?: string`, `references: { title: string; url: string; type: 'official' | 'blog' | 'aosp' }[]`, `updatedAt: string`
- `StudyProgressSchema (v1)`: `version: 1`, `statuses: Record<string, 'unlearned' | 'reviewing' | 'mastered'>`, `bookmarks: string[]`, `notes: Record<string, string>`, `lastVisitedId?: string`

### 8.2 部署方案（零后端任意静态托管）
1. **个人 VPS（Nginx 推荐）**：
   - 执行 `pnpm build` 生成 `dist/`，上传至 `/var/www/interview-prep/`。
   - Nginx 配置 `try_files $uri $uri/ /index.html;` 支持 History 路由，并对 `assets/` 启用长效强缓存（`Cache-Control: public, max-age=31536000, immutable`）及 `index.html` 协商缓存（`no-cache`）。
2. **Cloudflare Pages / Vercel / GitHub Pages**：
   - 连接 Git 仓库后设置 Build Command 为 `pnpm build`，Output Directory 为 `dist`；若挂载子路径可通过 `.env` 设置 `VITE_BASE_PATH=/repo-name/`。

---

## 9. Phase 2 实施路线图与质量门禁

在用户确认本设计方案与 [ANDROID_SYLLABUS.md](./ANDROID_SYLLABUS.md) 后，Phase 2 将按以下阶段有序推进：
1. **Stage 2A — 工程骨架与内容管线**：初始化 Vite + Vue 3 + TS + Tailwind v4，落地 `questionBankPlugin.ts`、Zod 校验、多领域注册表、Zero-FOUC 主题与三端响应式框架。
2. **Stage 2B — 核心交互与核心 SVG 引擎**：实现 MiniSearch 中文/英文检索弹窗、自测遮罩模式、Pinia 进度/笔记/JSON 备份、Diagram Lightbox、懒加载 Mermaid 容器及首批交互式核心 SVG 原理图。
3. **Stage 2C — 一期 Android 全量题库精编**：按照用户最终确认后的知识大纲，完成全部题目的五段式深度解析、流程图与权威外链整理。
4. **Stage 2D — 自动化测试与多端验收**：运行 `vue-tsc --noEmit`、`vitest run`、`vite build`、内容完整性校验脚本，并通过无头浏览器验证桌面/移动端及深浅色模式视觉表现。
5. **Stage 2E — 强制对抗代码审查（Gate 2）**：再次调用 `claude-opus-5-5-high` 对全部前端源码、XSS 安全、构建产物、移动交互与题库准确性进行红队对抗审查，清零所有 `P0/P1` 问题后交付。
