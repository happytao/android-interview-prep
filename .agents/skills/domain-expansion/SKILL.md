---
name: domain-expansion
description: >-
  Add a new technical interview domain (such as Frontend, Backend, DevOps, or
  Cybersecurity) to the site using the modular domain registry without
  refactoring core UI code. Use when expanding beyond Android.
---

# Domain Expansion Runbook

The site is designed so adding **Frontend**, **Backend**, **Ops/DevOps**, or **Cybersecurity** requires **zero edits** to core UI, routing, search, or registry source files.

## Step-by-Step Expansion Procedure

1. **Create Domain Content Directory**:
   ```text
   content/<domainId>/
   ├── _domain.json
   ├── 01-<l1-category>/
   │   ├── _category.json
   │   └── 01-<l2-subcategory>/
   │       ├── _category.json
   │       └── 01-<question>.md
   ```
   Example `<domainId>` values: `frontend`, `backend`, `devops`, `security`.

2. **Define `_domain.json`**:
   Include strictly schema-validated fields:
   - `id`: unique slug matching folder name (e.g., `"frontend"`).
   - `name`: display title (e.g., `"前端开发"`).
   - `tagline`: short description of target level and scope.
   - `status`: `"active"` when populated, or `"planned"` for roadmap preview cards.
   - `order`: sort index in the top domain switcher.
   - `icon`: Lucide icon name.
   - `accent`: `{ "light": "#2563EB", "dark": "#60A5FA" }` mapped automatically to `--domain-accent` CSS custom properties.

3. **Zero-Code-Edit Auto-Discovery**:
   The Vite plugin (`plugins/questionBankPlugin.ts`) automatically scans `content/*/_domain.json`, validates with Zod, and publishes every domain into `virtual:question-manifest`. `src/domains/registry.ts` consumes the manifest directly—no manual registration code edits are required.

4. **Add Domain-Specific Interactive Diagrams (Optional)**:
   Place custom Vue SVG components under `src/components/diagrams/<domainId>/<Name>.vue`. They are auto-discovered via `import.meta.glob('/src/components/diagrams/**/*.vue')` with `defineAsyncComponent` so `:::diagram <Name>` resolves lazily.

5. **Verify**:
   - Run `pnpm typecheck` (`vue-tsc --noEmit`).
   - Run `pnpm test` (`vitest run`) to verify schema validation, duplicate ID/slug checks, and search tokenization.
   - Run `pnpm build` and verify domain switching, mobile drawer, dark mode accent contrast, and isolated/global search filtering.
