# 个人技术面试复习站 · Personal Tech Interview Prep

面向个人高频复习与系统化沉淀的前端技术面试知识库（一期聚焦 **Android 中级开发工程师**，架构原生预留 **前端 / 后端 / 运维 / 网安** 等多领域扩展能力）。

> 当前处于 **Phase 1（方案设计与知识大纲审定阶段）**。依据项目约束，将在方案经 `claude-opus-5-5-high` 对抗审核及用户确认后，进入 Phase 2 前端工程实施。

## 核心特点规划

- **纯前端静态内容驱动（Git-as-CMS）**：无需后端与数据库，题库以 Markdown + YAML Frontmatter 形式存放于 `content/`，构建期进行 Schema 校验、Markdown 编译与中文分词索引生成，并按题目粒度懒加载。
- **两级+结构化知识体系**：`领域 (Domain) > 一级分类 (L1) > 二级专题 (L2) > 面试题`，聚焦**答题思路、核心原理解析、图解流程、高频追问与关键词速记**。
- **高可读图解体系**：原生深浅色自适应交互式 SVG 核心原理图 + 按需懒加载 Mermaid 流程图 + 全屏缩放灯箱（Lightbox）+ Android Developers / 简中优质博客权威参考外链（拒绝脆弱的第三方防盗链外链图片）。
- **深度复习体验**：支持移动端单手底部导航、零闪烁（Zero-FOUC）深浅色切换、`Ctrl/Cmd + K` 中英文混合即时检索、**自测遮罩/关键词提示模式**、掌握状态跟踪与 JSON 导入/导出备份。

## 文档与 AI 协作框架导航

- [个人建站需求.txt](./个人建站需求.txt) — 原始需求说明
- [AGENTS.md](./AGENTS.md) — 跨 Agent 核心工程规范与评审门禁
- [GEMINI.md](./GEMINI.md) — Antigravity / Gemini 工作区规则
- [CLAUDE.md](./CLAUDE.md) — Claude / Opus 对抗审查角色约定
- [.agents/skills/](./.agents/skills/) — 项目专属技能（`adversarial-review`、`question-authoring`、`domain-expansion`）
- [docs/DESIGN_PLAN.md](./docs/DESIGN_PLAN.md) — 完整技术架构、UI/UX 审美、图解方案与实施路线图
- [docs/ANDROID_SYLLABUS.md](./docs/ANDROID_SYLLABUS.md) — Android 中级工程师两级分类知识大纲（待审定）

## 环境前置说明（Phase 2 实施前）

当前环境已检测到 Git 2.46 与 Python 3.12，尚未检测到 Node.js。进入 Phase 2 前端开发前需准备：

- **Node.js 22 LTS**（推荐使用 `winget install OpenJS.NodeJS.LTS` 或 `fnm` 安装）
- **pnpm**（可通过 `corepack enable` 启用）
