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
- Numeric prefixes (`01-`, `02-`, ...) control deterministic display order in the sidebar.
- Every L1 and L2 folder contains a `_category.json` file defining `id`, `title`, `description`, and optional `order` / `icon`.

## 2. YAML Frontmatter Schema

All fields below must satisfy the build-time Zod schema:

```yaml
---
id: A-03-01
title: Handler、Looper、MessageQueue 协作原理与 epoll 休眠唤醒机制
domain: android
category: framework
subcategory: handler-looper
difficulty: medium          # basic | medium | hard
frequency: 5                # 1 (low) to 5 (must-know)
estimatedMinutes: 6
keywords:
  - ThreadLocal
  - MessageQueue
  - epoll
  - nativePollOnce
  - 同步屏障
diagram: HandlerLooperSvg     # Optional: matches interactive SVG component name
references:
  - title: Android Developers - Processes and Threads
    url: https://developer.android.com/guide/components/processes-and-threads
    type: official          # official | blog | aosp
  - title: Gityuan - Android 消息机制 Handler 源码解析
    url: https://gityuan.com/2015/12/26/handler-message-framework/
    type: blog
updatedAt: "2026-11-20"
---
```

## 3. Mandatory 5-Section Markdown Body

Calibrate depth for **mid-level engineers (2–5 years)**: prioritize **thought process, core mechanics, and architectural trade-offs**, and use **concise keywords** rather than walls of boilerplate code.

```markdown
## 面试答题思路
> 3–4 bullet points showing how to structure a crisp 2-minute verbal answer.

## 核心原理解析
Explain the internal mechanism, cause-and-effect chain, boundary conditions, and why it is designed this way. Use concise keyword callouts (`**ThreadLocal**` / `**Message.obtain()**`) instead of pasting 100 lines of source code.

## 图解流程
:::diagram HandlerLooperSvg
<!-- Or a fenced ```mermaid block for state/sequence/flow charts -->
:::

## 高频追问与关键词
- **追问 1**：为什么 Looper.loop() 死循环不会导致主线程 ANR？
  - 关键词：`epoll_wait`、`nativePollOnce`、消息驱动唤醒、ANR 触发条件（输入/广播/Service 超时）。
- **追问 2**：...

## 延伸参考
Summaries or takeaways pointing to the frontmatter `references` links.
```

## 4. Diagram & Asset Guardrails

1. **NO third-party image hotlinking**: Never use `![...](https://...)` pointing to WeChat MP, CSDN, Juejin, or Zhihu.
2. Prefer **Interactive SVG components** (`:::diagram ComponentName`) for core recurring mechanisms and **Mermaid** fenced blocks for sequence/flow/state charts.
3. Keep Mermaid node labels concise (max ~15–20 characters per line using `<br/>` only when verified or separate short lines) and quote labels containing parentheses or special characters so mobile rendering stays crisp.
4. Ensure all diagrams rely on semantic theme colors so Light and Dark modes both pass contrast checks.

## 5. Verification Checklist

- [ ] Frontmatter passes build-time Zod schema (`pnpm build` or content check script).
- [ ] All 5 sections exist and avoid excessive code dumps.
- [ ] `keywords` accurately summarize the key technical terms for Self-Test hint mode and search.
- [ ] External `references` URLs use `https://` and match real authoritative documentation or classic blog domains.
