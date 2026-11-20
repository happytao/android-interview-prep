---
name: adversarial-review
description: >-
  Run a structured red-team adversarial review of design plans or completed code
  using a claude-opus-5-5-high swarm worker. Use after completing Phase 1 design
  and syllabus documents and after completing Phase 2 code implementation.
---

# Adversarial Review Workflow (`claude-opus-5-5-high`)

This project mandates adversarial red-team reviews at two gates:
1. **Gate 1 (Plan & Syllabus Review)**: After `docs/DESIGN_PLAN.md` and `docs/ANDROID_SYLLABUS.md` are drafted, before any application coding begins.
2. **Gate 2 (Post-Code Review)**: After Phase 2 implementation and all automated checks pass, before final user sign-off.

## Step 1: Launch Swarm Reviewer

1. Set or update the swarm title (`swarm{action:"title", ...}`).
2. Ensure `monitor` is running if `swarm_monitor` is available:
   ```text
   swarm{action:"add", name:"monitor", brief:"You are this swarm's stall monitor. Load the swarm_monitor skill and follow it. Post only to break a stall."}
   ```
3. Spawn the reviewer pinned strictly to `claude-opus-5-5-high` in `workspace:"inherit"` (read-only audit):
   ```text
   swarm{
     action: "add",
     name: "opus-reviewer",
     model: "claude-opus-5-5-high",
     workspace: "inherit",
     brief: "<Gate-specific red-team audit brief — see checklists below>"
   }
   ```
   > If `opus-reviewer` already exists and is `waiting` from Gate 1, wake it via `post_message` mentioning `@opus-reviewer` with the Gate 2 code review prompt instead of creating a duplicate worker.
4. Wait for `@coordinator [done]` on the board via `swarm_wait` (or end the creation turn if board tools have not arrived yet).

## Step 2: Gate-Specific Audit Checklists

### Gate 1 — Design & Syllabus Checklist
Instruct `opus-reviewer` to inspect `个人建站需求.txt`, `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, `.agents/skills/*/SKILL.md`, `docs/DESIGN_PLAN.md`, and `docs/ANDROID_SYLLABUS.md`, and stress-test:
- Completeness against every sentence in `个人建站需求.txt`.
- Pure-frontend static architecture soundness, multi-domain scalability, and Windows environment readiness (Node.js availability).
- Vite virtual module + lazy-loading boundary (ensuring initial bundle size stays small as the bank grows across domains).
- CJK + English MiniSearch tokenization edge cases (`事件分发`, `Handler`, `ANR`, `ViewModel`).
- Tailwind v4 dark-mode selector mechanics, zero-FOUC script, and SVG/Mermaid theme & ID collision risks.
- Mobile UX for dense flowcharts, touch targets, self-test mode, and animation restraint (`prefers-reduced-motion`).
- Mid-level Android syllabus calibration (missing core topics, outdated/over-niche topics, realistic diagram scope).
- Consistency across `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, and `.agents/skills/*`.

### Gate 2 — Code & Content Checklist
Instruct `opus-reviewer` to inspect `src/`, `plugins/`, `content/`, `index.html`, `package.json`, `vite.config.ts`, and test outputs, and stress-test:
- Type safety, dead code, broken imports, and strict adherence to `AGENTS.md`.
- XSS & injection risks (`markdown-it` `html: false`, external URL protocol validation, `localStorage` JSON import validation).
- Real behavior of dark/light mode toggle, zero-FOUC init, mobile drawer/bottom-sheet/bar, keyboard shortcuts, and diagram zoom lightbox.
- Mermaid lazy-loading & dynamic re-rendering on route/theme switch without DOM ID collisions.
- Search accuracy on Chinese phrases, English symbols, and empty/edge queries.
- Content schema validation and mid-level quality of authored questions/diagrams/links.

## Step 3: Severity Rubric & Resolution Protocol

Require the reviewer to classify every finding:
- **P0 (Blocker)**: Broken requirement, security/XSS flaw, architecture contradiction, build/runtime crash, or missing core gate. Must be fixed before advancing.
- **P1 (Major)**: Significant UX flaw (mobile/dark mode), performance cliff, search blind spot, or major syllabus gap. Must be fixed or explicitly mitigated with user-visible rationale.
- **P2 (Minor)**: Maintainability improvement, edge-case polish, or clarifying documentation.
- **P3 (Suggestion)**: Optional enhancement or future idea.

Verdict must be one of: `PASS`, `PASS WITH REVISIONS`, or `BLOCKED`.

## Step 4: Archive & Remediate

1. Save the full audit findings and point-by-point resolution table in:
   - `docs/ADVERSARIAL_REVIEW_PLAN.md` (Gate 1)
   - `docs/ADVERSARIAL_REVIEW_CODE.md` (Gate 2)
2. Apply fixes for all valid `P0`/`P1` (and worthwhile `P2`) findings.
3. Re-verify (`git status`, automated checks for Gate 2) and commit the review log + fixes cleanly.
