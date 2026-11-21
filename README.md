# 个人技术面试复习站 · Personal Tech Interview Prep

[![Deploy to VPS](https://github.com/happytao/android-interview-prep/actions/workflows/deploy.yml/badge.svg)](https://github.com/happytao/android-interview-prep/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

面向个人高频复习与系统化沉淀的前端技术面试知识库（Phase 1 已完成 **Android 中级开发工程师** 10 大模块 · 34 个二级专题 · 111 题完整上线；架构原生预留 **前端 / 后端 / 运维 / 网安** 等多领域零改代码扩展能力）。

## 核心特性（Phase 2 已实施完成）

- **纯前端静态内容驱动（Git-as-CMS）**：无需后端与数据库，题库以 Markdown + YAML Frontmatter 存放于 [`content/`](./content/)，构建期完成 Zod Schema 校验、Shiki 语法着色（零运行时 Shiki 包）、Markdown 编译与中英文分词索引生成，并按单题粒度懒加载（111 个独立 JS Chunk）。
- **两级+结构化知识体系**：`领域 (Domain) > 一级分类 (L1) > 二级专题 (L2) > 面试题`，每题统一遵循「面试答题思路 → 核心原理解析 → 图解流程 → 高频追问与关键词 → 延伸参考」五段式标准。
- **高可读与防盗链安全图解**：
  - 5 张旗舰主题自适应交互式 SVG 原理图（`HandlerLooperSvg`、`BinderMmapSvg`、`TouchDispatchSvg`、`VsyncPipelineSvg`、`OkHttpChainSvg`）；
  - 66 张按需懒加载 + 严苛模式（`securityLevel: 'strict'`）Mermaid 流程图 + 全屏触摸缩放灯箱（Lightbox）；
  - 40 张移动端横向可滚动对比表；禁用第三方防盗链外链图，提供 `developer.android.google.cn` 国内镜像一键切换。
- **深度复习体验**：支持移动端单手底部导航条 + 抽屉目录、Zero-FOUC 深浅色切换、`Ctrl/Cmd + K` 中英文分词即时检索、**自测折叠遮罩/防剧透关键词提示模式**、Leitner 间隔复习队列、随机模拟抽题（`/mock`）与防原型污染的 JSON 导入/导出备份。

## 环境要求与常用指令

环境需求：**Node.js >= 22**（当前工程 `.nvmrc` 为 `24`）+ **pnpm**（`pnpm@12.21.0`）。

```powershell
# 安装依赖
pnpm install

# 启动本地热更新开发服务器
pnpm dev

# 全量类型检查（vue-tsc + tsconfig.node.json）
pnpm typecheck

# 运行单元与全站 111 题内容完整性校验测试
pnpm test

# 类型检查 + Vite 静态打包 + dist/404.html SPA 回退生成
pnpm build

# 本地预览构建产物
pnpm preview --port 4173 --strictPort

# 本地手工部署（应急用；日常由 GitHub Actions 自动发布，见下节）
./scripts/deploy.ps1 -Server root@your-vps-ip -RemotePath /var/www/interview-prep
```

## 自动化构建与发布（GitHub Actions）

推送到 `main` 分支即自动执行：**类型检查 → 单元/内容校验测试 → 生产构建 → rsync 到 VPS → 修正权限并 reload nginx**。

- Workflow：[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)
- 也可在 GitHub 的 **Actions → Deploy to VPS → Run workflow** 手动触发
- 触发范围：`content/**`、`src/**`、`plugins/**`、`package.json` 等实际代码或题库变更；
  `docs/**`、`*.txt`、`README.md`、`LICENSE` 的改动**不会**触发发布（避免纯文档提交污染线上）
- 并发保护：`concurrency.group = deploy-production` 且 `cancel-in-progress: false`，连续提交不会互相覆盖

仓库需要配置 5 个 Actions Secrets：`VPS_HOST`、`VPS_PORT`、`VPS_USER`、`VPS_SSH_KEY`、`VPS_TARGET_DIR`。
其中 `VPS_SSH_KEY` 为部署私钥全文；部署后流水线会统一修正目录 755 / 文件 644 权限并 reload nginx，
避免从归档解压带来的 `777` 权限问题。

## 文档与 AI 协作框架导航

- [个人建站需求.txt](./个人建站需求.txt) — 原始需求说明（保持原样）
- [AGENTS.md](./AGENTS.md) — 跨 Agent 核心工程规范与评审门禁
- [GEMINI.md](./GEMINI.md) / [CLAUDE.md](./CLAUDE.md) — Agent 工作区角色约定
- [.agents/skills/](./.agents/skills/) — 项目专属技能（`adversarial-review`、`question-authoring`、`domain-expansion`）
- [docs/DESIGN_PLAN.md](./docs/DESIGN_PLAN.md) — 完整系统架构、视觉审美、内容管线与部署方案
- [docs/ANDROID_SYLLABUS.md](./docs/ANDROID_SYLLABUS.md) — Android 中级工程师 10 大模块 111 题完整知识大纲
- [docs/ADVERSARIAL_REVIEW_PLAN.md](./docs/ADVERSARIAL_REVIEW_PLAN.md) — Gate 1 方案对抗审查与整改归档
- [docs/ADVERSARIAL_REVIEW_CODE.md](./docs/ADVERSARIAL_REVIEW_CODE.md) — Gate 2 代码与题库对抗审查与整改归档

## 开源协议

本项目基于 [MIT License](./LICENSE) 开源。

题库中引用的官方 Android 文档链接、AOSP 源码页面与 CC BY 4.0 图示，版权归各自原作者所有；
本项目仅作学习索引与引用，不以之主张任何权利。
