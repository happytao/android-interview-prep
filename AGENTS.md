# AGENTS.md — Project Engineering Constitution

This file is the canonical engineering specification for all AI agents and contributors working in this repository. Keep instructions concise, authoritative, and verified against actual repo files.

## 1. Project Overview & Phased Roadmap

This project is a **personal technical interview preparation web application** built with **Vue 3 + TypeScript + Vite + Tailwind CSS v4**.

- **Phase 1 (Current Target)**: Mid-level Android Engineer interview question bank (`android` domain), featuring two-level+ categorization, principle-driven answers, interactive SVG & Mermaid diagrams, self-test collapse/reveal mode, dark/light themes, and mobile-first ergonomics.
- **Future Phases (Built-in Extensibility)**: Multi-domain expansion to **Frontend**, **Backend**, **Ops/DevOps**, and **Cybersecurity** without refactoring core UI, routing, search, or progress-tracking code.
- **Original Requirements**: Always respect [个人建站需求.txt](./个人建站需求.txt) (do not delete or overwrite this file).

## 2. Core Architecture Rules

### 2.1 Static Content-Driven Architecture (Git-as-CMS, No Backend)
- All question bank content lives in version-controlled Markdown files with YAML frontmatter under `content/<domain>/<NN-l1>/<NN-l2>/<NN-slug>.md`.
- **No backend database or CMS server**: updates follow a clean Git workflow (`author/edit markdown → build → static deploy`).
- **Build-Time Content Pipeline**: A custom Vite plugin (`plugins/questionBankPlugin.ts`) normalizes paths to POSIX, parses frontmatter (`gray-matter`), validates every domain, category, and question against strict `zod` schemas, compiles Markdown + Shiki (`defaultColor: false`, dual CSS-variable themes) strictly at build time, and exposes:
  - `virtual:question-manifest` (lightweight domain/L1/L2 tree + question metadata for navigation and filtering).
  - `virtual:search-index` (pre-built MiniSearch index sharing `src/utils/tokenizer.ts` across build & client for CJK + CamelCase tokenization).
  - **Per-question lazy loading**: `.md?compiled` emits typed block chunks (`html` | `diagram` | `mermaid`) loaded on demand per route.

### 2.2 Multi-Domain Isolation (Zero-Code-Edit Discovery)
- Each technical domain has a dedicated folder `content/<domainId>/` containing `_domain.json` (`id`, `name`, `tagline`, `accent`, `icon`, `status: 'active' | 'planned'`, `order`) and numbered L1/L2 category subdirectories with `_category.json` metadata.
- The Vite plugin auto-discovers all `_domain.json` files and exposes them via `virtual:question-manifest`; `src/domains/registry.ts` reads directly from the manifest so adding a domain requires **zero core code edits**.
- UI styling uses semantic `--domain-accent` CSS tokens so switching domains swaps accent identity cleanly without duplicating views or components.

### 2.3 Diagram & Visual Asset Policy
- **Strictly Forbidden**: Never hotlink third-party blog images (e.g., WeChat MP, CSDN, Juejin, Zhihu) via `<img src="https://...">`. They suffer from Referer anti-leech blocking, link rot, copyright issues, and broken white backgrounds in dark mode.
- **Approved Visual Layers**:
  1. **Local Theme-Aware Interactive SVG Components** (`src/components/diagrams/<domain>/*.vue`) built atop shared primitives and scoped `<defs>` IDs (`useId()`), styled with semantic CSS theme tokens (`currentColor` / `--diagram-*`) and gating JS/rAF animations via `usePrefersReducedMotion()`.
  2. **Lazy-Loaded Mermaid Diagrams** (`mermaid` code blocks in Markdown), dynamically imported only on visible & revealed pages (`startOnLoad: false`, `securityLevel: 'strict'`), rendered via a serialized queue with unique IDs and light/dark theme re-sync.
  3. **Self-Hosted Official Figures (CC BY 4.0)**: Official Android Developers figures may be stored locally under `src/assets/figures/android/` with explicit attribution and rendered inside a light-surface Figure Card in dark mode.
  4. **Diagram Lightbox**: Every SVG, Mermaid, and official figure supports touch-safe zoom & pan (`touch-action: none`), passing reactive step state rather than cloning DOM.
  5. **Verified Authoritative Links**: External links (`https://` only, allowlisted domains with `verifiedAt`) to official Android Developers docs (with optional `developer.android.google.cn` mirror toggle), AOSP (`source.android.com`, `cs.android.com`), and classic Chinese blogs appear as reference cards.

## 3. Frontend & UI Conventions

- **Framework & Language**: Vue 3.5 (`<script setup lang="ts">`) with strict TypeScript (`vue-tsc --noEmit` must pass with zero errors).
- **State Persistence**: Pinia stores for study progress (`unlearned / reviewing / mastered`), bookmarks, personal notes (rendered as safe plain text), and self-test state, persisted in `localStorage` with schema versioning, cross-tab `storage` sync, `navigator.storage?.persist?.()`, and hardened **JSON Export/Import** (file + clipboard, prototype-pollution safe, orphaned-ID reporting).
- **Styling & Theming**:
  - Tailwind CSS v4 configured with `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));`.
  - Semantic CSS variables for canvas, surface, text, border, and domain accents; system CJK + Latin/Mono font stack (zero runtime CDN dependencies).
  - **Zero-FOUC Theme Initialization**: An inline `<script>` in `index.html` `<head>` (with `try/catch` around dedicated `localStorage` key) sets `data-theme`, `color-scheme`, and `<meta name="theme-color">` before first paint.
- **Mobile & Motion Ergonomics**:
  - Mobile-first responsive design (desktop 3-column workspace → tablet drawer → mobile bottom-sheet navigator + sticky bottom action bar with defined z-index stack & safe-area padding).
  - Never use horizontal swipe-to-navigate (conflicts with horizontal scrolling of tables, code blocks, and diagrams).
  - Tasteful transitions that strictly respect CSS `@media (prefers-reduced-motion: reduce)` and JS `usePrefersReducedMotion()`.
- **Security**:
  - Configure `markdown-it` with `html: false` (never parse raw HTML inside Markdown) to guarantee XSS safety.
  - Validate external reference URLs (`https://` only, domain allowlist; block `javascript:` / `data:` URIs).

## 4. Content Authoring Standards (Mid-Level Android Calibration)

- **Minimum 2-Level Classification**: `Domain > L1 Category > L2 Subcategory > Question`.
- **Immutable IDs**: Use immutable semantic IDs (`android.handler-epoll`) rather than positional IDs so reordering or adding topics never orphans study records; derive URL slugs from `NN-slug.md` with optional `aliases`.
- **Target Depth**: Mid-level Android Engineer (approx. 2–5 years experience) — prioritize **answering strategy, underlying principles, lifecycle/IPC/rendering/memory mechanics, and trade-offs**; summarize concrete APIs or boilerplate with crisp **keywords** rather than long code dumps.
- **Mandatory 5-Section Structure** (see `.agents/skills/question-authoring/SKILL.md`):
  1. `## 面试答题思路` (30–60s executive framing & logical flow)
  2. `## 核心原理解析` (Architecture, mechanism, cause-and-effect, trade-offs)
  3. `## 图解流程` (Interactive SVG directive, Mermaid flowchart, self-hosted CC-BY figure, or structured comparison table)
  4. `## 高频追问与关键词` (Follow-up probes + keyword flashcards for rapid recall)
  5. `## 延伸参考` (Authoritative `https://` Android Docs & classic Chinese blog links)

## 5. Mandatory Workflow & Adversarial Review Gates

This project enforces two mandatory adversarial review gates before advancing phases (`claude-opus-5-5-high` at Gate 1; `claude-opus-5-5-medium` at Gate 2 with `gemini-4-neon-high` / `gemini-4-argon-high` fallback if Opus quota is exhausted):

1. **Gate 1 — Design & Syllabus Review (Before Coding)**:
   - Complete `docs/DESIGN_PLAN.md` and `docs/ANDROID_SYLLABUS.md`.
   - Run adversarial review via a `claude-opus-5-5-high` swarm worker (see `.agents/skills/adversarial-review/SKILL.md`).
   - Archive findings & resolutions in `docs/ADVERSARIAL_REVIEW_PLAN.md` and refine docs.
   - **STOP and obtain explicit user approval** on the syllabus and design before writing any Vue/TS application code.
2. **Gate 2 — Post-Implementation Code Review (Before Final Sign-Off)**:
   - Run full automated verification (`vue-tsc --noEmit`, `vitest run`, `vite build`, content schema/link check).
   - Run adversarial code review via **`claude-opus-5-5-medium`** (if `claude-opus-5-5-medium` quota is exhausted, report to the user and fall back to **`gemini-4-neon-high`** or **`gemini-4-argon-high`**) covering architecture, security/XSS, dark mode, mobile UX, CJK search, and technical accuracy.
   - Fix all `P0` (Blocker) and `P1` (Major) issues, archive findings in `docs/ADVERSARIAL_REVIEW_CODE.md`, and re-run all verification checks after final edits.

## 6. Git Conventions

- Branch: `main` (create feature branches only when explicitly needed).
- Use **Conventional Commits**: `feat:`, `fix:`, `docs:`, `content:`, `style:`, `refactor:`, `test:`, `chore:`.
- Keep commits atomic and verify `git status` / `git diff` before committing. Never commit `node_modules/`, `dist/`, or secret `.env*` files.

## 7. Repository & Skills Map

- Project Skills (`.agents/skills/`):
  - `adversarial-review` — Run `claude-opus-5-5-high` red-team audits at Gate 1 and Gate 2.
  - `question-authoring` — Schema, template, and diagram rules for authoring interview questions.
  - `domain-expansion` — Checklist to onboard new technical domains (Frontend/Backend/Ops/Security).
- Design & Audit Docs (`docs/`):
  - `docs/DESIGN_PLAN.md` — System architecture, visual/UX design, content pipeline, deployment.
  - `docs/ANDROID_SYLLABUS.md` — Complete 2-level+ Mid-Level Android syllabus for user sign-off.
  - `docs/ADVERSARIAL_REVIEW_PLAN.md` — Gate 1 Opus 5.5 adversarial audit log & resolutions.
  - `docs/ADVERSARIAL_REVIEW_CODE.md` — Gate 2 Opus 5.5 adversarial code review log & fixes.
