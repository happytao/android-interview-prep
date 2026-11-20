# GEMINI.md — Antigravity Agent Workspace Rules

Read [AGENTS.md](./AGENTS.md) first — it is the canonical engineering constitution for this repository. Do not duplicate its rules here.

## Antigravity-Specific Execution Rules

1. **Mandatory Adversarial Reviews via Swarm (`claude-opus-5-5-high`)**:
   - At **Gate 1 (Design & Syllabus)** and **Gate 2 (Post-Implementation Code)**, invoke the `swarm` tool to add a reviewer pinned to `model: "claude-opus-5-5-high"` (alongside `monitor` when `swarm_monitor` is available).
   - Follow the exact procedures and checklists in [.agents/skills/adversarial-review/SKILL.md](./.agents/skills/adversarial-review/SKILL.md).
   - Do not silently fall back to another model if `claude-opus-5-5-high` is unavailable or quota-exhausted; report the issue immediately.

2. **Phase Gate Discipline**:
   - **Never** scaffold or write Vue/TS application code (`package.json`, `src/`, etc.) until the user explicitly reviews and approves `docs/DESIGN_PLAN.md` and `docs/ANDROID_SYLLABUS.md`.
   - Keep `个人建站需求.txt` untouched.

3. **Workspace Skills to Activate on Demand**:
   - `.agents/skills/adversarial-review/SKILL.md` — Red-team plan & code reviews with `claude-opus-5-5-high`.
   - `.agents/skills/question-authoring/SKILL.md` — Authoring/editing Markdown interview questions.
   - `.agents/skills/domain-expansion/SKILL.md` — Onboarding new domains beyond Android.

4. **Verification Discipline**:
   - Only report test, typecheck, or build results after actually running them following your final edit and inspecting complete output.
