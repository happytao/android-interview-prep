---
name: question-authoring
description: >-
  Author or update interview questions in Markdown with validated frontmatter,
  structured mid-level principle explanations, theme-aware diagrams, and
  authoritative references. Use when adding or editing interview content.
---

# Question Authoring Standard

Follow this runbook whenever creating or editing interview questions so build-time Zod validation passes and answers match the mid-level principle-first format.

## 1. Directory Layout & Naming

Place each question inside its 2-level hierarchy:
```text
content/<domain>/<NN-l1-slug>/<NN-l2-slug>/<NN-question-slug>.md
```
- Example: `content/android/03-framework/01-handler-looper/01-handler-mechanism-epoll.md`
- Numeric prefixes (`01-`, `02-`, ...) control deterministic display order in the sidebar; the plugin normalizes paths to POSIX and strips `NN-` to derive `category`, `subcategory`, `slug`, and display `order` automatically.
- Every L1 and L2 folder contains a `_category.json` file defining `name`, `description`, and optional `icon`. Exclude `_*.md` and `README.md` from question compilation.

## 2. YAML Frontmatter Schema

All fields below must satisfy the build-time Zod schema (`id` and `slug` must be unique per domain):

```yaml
---
id: android.handler-epoll        # Immutable semantic ID (NEVER positional like A-03-01)
aliases:                         # Optional old slugs/IDs for redirect & import compatibility
  - handler-mechanism
title: Handler、Looper、MessageQueue 协作原理与 epoll 休眠唤醒机制
summary: 拆解主线程消息队列的链表调度、ThreadLocal 隔离与 Linux epoll 内核休眠唤醒链路。
priority: must-know              # must-know (高频必考) | core (核心常考) | bonus (中级加分)
difficulty: medium               # basic | medium | hard
frequency: 5                     # 1 (low) to 5 (must-know)
estimatedMinutes: 6
status: published                # draft | published
keywords:
  - ThreadLocal
  - MessageQueue
  - epoll
  - nativePollOnce
  - 同步屏障
diagram: HandlerLooperSvg        # Optional: matches src/components/diagrams/<domain>/<Name>.vue
references:
  - title: Android Developers - Processes and Threads
    url: https://developer.android.com/guide/components/processes-and-threads
    type: official               # official | blog | aosp
    verifiedAt: "2026-11-20"
  - title: Gityuan - Android 消息机制 Handler 源码解析
    url: https://gityuan.com/2015/12/26/handler-message-framework/
    type: blog
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---
```

> Note: `domain`, `category`, `subcategory`, `slug`, and `order` are derived from the directory path (`content/<domain>/<NN-category>/<NN-subcategory>/<NN-slug>.md`) to prevent metadata drift.

## 3. Mandatory 5-Section Markdown Body

Calibrate depth for **mid-level engineers (2–5 years)**: prioritize **thought process, core mechanics, and architectural trade-offs**, and use **concise keywords** rather than walls of boilerplate code.

```markdown
## 面试答题思路
> 3–4 bullet points delivering a crisp 30–60s executive framing before diving deeper.

## 核心原理解析
Explain the internal mechanism, cause-and-effect chain, boundary conditions, and why it is designed this way. Use concise keyword callouts (`**ThreadLocal**` / `**Message.obtain()**`) instead of pasting 100 lines of source code.

## 图解流程
:::diagram HandlerLooperSvg
:::

## 高频追问与关键词
- **追问 1**：为什么 Looper.loop() 死循环不会导致主线程 ANR？
  - 关键词：`epoll_wait`、`nativePollOnce`、消息驱动唤醒、ANR 触发条件（输入/广播/Service 超时）。
- **追问 2**：...

## 延伸参考
Brief reading guidance pointing to the frontmatter `references` links.
```

In `## 图解流程`, you may use any approved visual form:
1. **Interactive SVG directive**: `:::diagram ComponentName` (with closing `:::` on its own line; do not put HTML comments or nested code blocks inside `:::diagram`).
2. **Mermaid diagram**: A standalone fenced ```` ```mermaid ```` code block.
3. **Self-hosted Official Figure**: Local CC BY 4.0 Android Developers diagram under `src/assets/figures/<domain>/` with attribution.
4. **Structured Comparison Table**: A crisp Markdown comparison table for pure trade-off/comparison topics.

## 4. Diagram & Asset Guardrails

1. **NO third-party blog image hotlinking**: Never use `![...](https://...)` pointing to external blog images (WeChat MP, CSDN, Juejin, Zhihu, etc.).
2. **Scoped SVG IDs & Motion**: Interactive SVG components must scope `<defs>` IDs with Vue 3.5 `useId()` and gate JS/rAF animations with `usePrefersReducedMotion()`.
3. **Mermaid legibility**: Keep node labels concise and quote labels containing parentheses or special characters so mobile rendering stays crisp.
4. **Allowlisted `https://` References**: All external `references[].url` values must use `https://` and belong to the curated authoritative allowlist (`developer.android.com`, `developer.android.google.cn`, `source.android.com`, `cs.android.com`, `kotlinlang.org`, `gityuan.com`, `hencoder.com`, `rengwuxian.com`, `tech.meituan.com`, `guolin.tech`, `square.github.io`, `bumptech.github.io`, `juejin.cn`, etc.).

## 5. Verification Checklist

- [ ] Frontmatter & `_category.json` pass build-time Zod schema (`pnpm build` or `pnpm test`).
- [ ] All 5 sections exist, avoiding bloated boilerplate code dumps.
- [ ] `keywords` accurately summarize the key technical terms for Self-Test hint mode and search.
- [ ] External `references` use `https://`, pass allowlist check, and carry `verifiedAt`.
