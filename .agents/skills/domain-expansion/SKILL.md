---
name: domain-expansion
description: >-
  Add a new technical interview domain (such as Frontend, Backend, DevOps, or
  Cybersecurity) to the site using the modular domain registry without
  refactoring core UI code. Use when expanding beyond Android.
---

# Domain Expansion Runbook

The site is designed so adding **Frontend**, **Backend**, **Ops/DevOps**, or **Cybersecurity** requires **zero changes** to core layout, search, theming, or progress-tracking logic.

## Step-by-Step Expansion Procedure

1. **Create Domain Content Directory**:
   ```text
   content/<domainId>/
   ├── domain.config.ts
   ├── 01-<l1-category>/
   │   ├── _category.json
   │   └── 01-<l2-subcategory>/
   │       ├── _category.json
   │       └── 01-<question>.md
   ```
   Example `<domainId>` values: `frontend`, `backend`, `devops`, `security`.

2. **Define `domain.config.ts`**:
   Include:
   - `id`: unique slug matching folder name (e.g., `'frontend'`).
   - `name`: display title (e.g., `'前端开发'`).
   - `tagline`: short description of target level and scope.
   - `status`: `'active'` when populated, or `'planned'` for roadmap preview cards.
   - `order`: sort index in the top domain switcher.
   - `icon`: Lucide icon name.
   - `accent`: light & dark hex tokens (mapped to `--domain-accent` CSS custom properties).

3. **Register in `src/domains/registry.ts`**:
   Import and add the domain config to the exported domain registry array (or ensure glob auto-discovery picks up `content/*/domain.config.ts`).

4. **Add Domain-Specific Interactive Diagrams (Optional)**:
   Place custom Vue SVG diagrams under `src/components/diagrams/<domainId>/` and export them in the diagram component registry so `:::diagram <Name>` resolves automatically.

5. **Verify**:
   - Run `pnpm typecheck` (`vue-tsc --noEmit`).
   - Run `pnpm test` (`vitest run`) and the content validation script to ensure all frontmatter, L1/L2 category links, and search tokens build cleanly.
   - Run `pnpm build` and check domain switching, mobile drawer, dark mode accent contrast, and isolated/global search filtering.
