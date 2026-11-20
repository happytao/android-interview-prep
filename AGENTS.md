# AGENTS.md — Project Engineering Constitution

This file is the canonical engineering specification for all AI agents and contributors working in this repository. Keep instructions concise, authoritative, and verified against actual repo files.

## 1. Project Overview & Phased Roadmap

This project is a **personal technical interview preparation web application** built with **Vue 3 + TypeScript + Vite + Tailwind CSS v4**.

- **Phase 1 (Current Target)**: Mid-level Android Engineer interview question bank (`android` domain), featuring two-level+ categorization, principle-driven answers, interactive SVG & Mermaid diagrams, self-test reveal mode, dark/light themes, and mobile-first ergonomics.
- **Future Phases (Built-in Extensibility)**: Multi-domain expansion to **Frontend**, **Backend**, **Ops/DevOps**, and **Cybersecurity** without refactoring core UI, routing, search, or progress-tracking code.
- **Original Requirements**: Always respect [个人建站需求.txt](./个人建站需求.txt) (do not delete or overwrite this file).

## 2. Core Architecture Rules

### 2.1 Static Content-Driven Architecture (Git-as-CMS, No Backend)
- All question bank content lives in version-controlled Markdown files with YAML frontmatter under `content/<domain>/<NN-l1>/<NN-l2>/<slug>.md`.
- **No backend database or CMS server**: updates follow a clean Git workflow (`author/edit markdown → build → static deploy`).
- **Build-Time Content Pipeline**: A custom Vite plugin parses frontmatter (`gray-matter`), validates every category and question against strict `zod` schemas at dev/build time, compiles Markdown safely, and exposes:
  - `virtual:question-manifest` (lightweight domain/L1/L2 tree + question metadata for navigation and filtering).
  - `virtual:search-index` (pre-built MiniSearch index supporting Chinese + English + camelCase tokenization).
  - **Per-question lazy loading** (`import.meta.glob`) so only the active question's compiled body is fetched/hydrated on navigation.

### 2.2 Multi-Domain Isolation
- Each technical domain has a dedicated folder `content/<domainId>/` containing `domain.config.ts` (id, title, accent color tokens, icon, status `active | planned`) and numbered L1/L2 category subdirectories with `_category.json` metadata.
- Domains register declaratively in `src/domains/registry.ts`.
- UI styling uses semantic `--domain-accent` CSS tokens so switching domains swaps accent identity cleanly without duplicating views or components.

### 2.3 Diagram & Visual Asset Policy
- **Strictly Forbidden**: Never hotlink third-party blog images (e.g., WeChat MP, CSDN, Juejin, Zhihu) via `<img src="https://...">`. They suffer from Referer anti-leech blocking, link rot, and broken white backgrounds in dark mode.
- **Approved Visual Layers**:
  1. **Local Theme-Aware Interactive SVG Components** (`src/components/diagrams/android/*.vue`) for core flagship mechanisms, styled with semantic CSS theme tokens (`currentColor` / `--diagram-*`).
  2. **Lazy-Loaded Mermaid Diagrams** (`mermaid` code blocks in Markdown), dynamically imported only on pages that use them, rendered with light/dark theme sync and collision-free unique element IDs.
  3. **Diagram Lightbox**: Every SVG and Mermaid diagram supports click/tap zoom & pan on mobile and desktop.
  4. **Verified Authoritative Links**: External links to official Android Developers documentation (`developer.android.com`) and classic Chinese engineering blogs (Gityuan, HenCoder, 美团技术团队, 字节跳动技术团队, etc.) appear as structured reference cards.

## 3. Frontend & UI Conventions

- **Framework & Language**: Vue 3 (`<script setup lang="ts">`) with strict TypeScript (`vue-tsc --noEmit` must pass with zero errors).
- **State Persistence**: Pinia stores for study progress (`unlearned / reviewing / mastered`), bookmarks, personal notes, and filter/self-test state, persisted in `localStorage` with a versioned schema and **JSON Export/Import** backup/restore.
- **Styling & Theming**:
  - Tailwind CSS v4 configured with `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));`.
  - Semantic CSS variables for canvas, surface, text, border, and domain accents.
  - **Zero-FOUC Theme Initialization**: An inline `<script>` in `index.html` `<head>` resolves saved preference (`light | dark | system`) and sets `data-theme` before first paint.
- **Mobile & Motion Ergonomics**:
  - Mobile-first responsive design (desktop 3-column workspace → tablet drawer → mobile bottom-sheet navigator + single-hand bottom action bar).
  - Tasteful micro-animations (accordion, answer reveal, progress fill, SVG step highlighting) that strictly respect `@media (prefers-reduced-motion: reduce)`.
- **Security**:
  - Configure `markdown-it` with `html: false` (never parse raw HTML inside Markdown) to guarantee XSS safety across all rendered content and personal notes.
  - Validate external reference URLs (`https://` / `http://` only; block `javascript:` URIs).

## 4. Content Authoring Standards (Mid-Level Android Calibration)

- **Minimum 2-Level Classification**: `Domain > L1 Category > L2 Subcategory > Question`.
- **Target Depth**: Mid-level Android Engineer (approx. 2–5 years experience) — prioritize **answering strategy, underlying principles, lifecycle/IPC/rendering/memory mechanics, and trade-offs**; summarize concrete APIs or boilerplate with crisp **keywords** rather than long code dumps.
- **Mandatory 5-Section Structure** (see `.agents/skills/question-authoring/SKILL.md`):
  1. `## 面试答题思路` (30-second executive framing & logical flow)
  2. `## 核心原理解析` (Architecture, mechanism, cause-and-effect, trade-offs)
  3. `## 图解流程` (Interactive SVG directive and/or Mermaid flowchart)
  4. `## 高频追问与关键词` (Follow-up probes + keyword flashcards for rapid recall)
  5. `## 延伸参考` (Authoritative Android Docs & classic Chinese blog links)

## 5. Mandatory Workflow & Adversarial Review Gates

This project enforces two mandatory adversarial review gates using **`claude-opus-5-5-high`** before advancing phases:

1. **Gate 1 — Design & Syllabus Review (Before Coding)**:
   - Complete `docs/DESIGN_PLAN.md` and `docs/ANDROID_SYLLABUS.md`.
   - Run adversarial review via a `claude-opus-5-5-high` swarm worker (see `.agents/skills/adversarial-review/SKILL.md`).
   - Archive findings & resolutions in `docs/ADVERSARIAL_REVIEW_PLAN.md` and refine docs.
   - **STOP and obtain explicit user approval** on the syllabus and design before writing any Vue/TS application code.
2. **Gate 2 — Post-Implementation Code Review (Before Final Sign-Off)**:
   - Run full automated verification (`vue-tsc --noEmit`, `vitest run`, `vite build`, content schema/link check).
   - Run adversarial code review via `claude-opus-5-5-high` covering architecture, security/XSS, dark mode, mobile UX, CJK search, and technical accuracy.
   - Fix all `P0` (Blocker) and `P1` (Major) issues, archive findings in `docs/ADVERSARIAL_REVIEW_CODE.md`, and re-run all verification checks after final edits.

## 6. Git Conventions

- Branch: `main` (create feature branches only when explicitly needed).
- Use **Conventional Commits**: `feat:`, `fix:`, `docs:`, `content:`, `style:`, `refactor:`, `test:`, `chore:`.
- Keep commits atomic and verify `git status` / `git diff` before committing. Never commit `node_modules/`, `dist/`, or `.env*` secrets.

## 7. Repository & Skills Map

- Project Skills (`.agents/skills/`):
  - `adversarial-review` — Run `claude-opus-5-5-high` red-team audits at Gate 1 and Gate 2.
  - `question-authoring` — Schema, template, and diagram rules for authoring interview questions.
  - `domain-expansion` — Checklist to onboard new technical domains (Frontend/Backend/Ops/Security).
- Design & Planning Docs (`docs/`):
  - `docs/DESIGN_PLAN.md` — System architecture, visual/UX design, content pipeline, deployment.
  - `docs/ANDROID_SYLLABUS.md` — Complete 2-level+ Mid-Level Android syllabus for user sign-off.
  - `docs/ADVERSARIAL_REVIEW_PLAN.md` — Gate 1 Opus 5.5 adversarial audit log & resolutions.
