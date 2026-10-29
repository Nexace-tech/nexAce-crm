# Default Icon System Rule

- **FontAwesome Icons Only**: ALWAYS use FontAwesome 6 icon classes (`<i className="fa-solid fa-..." />`) by default for all UI components, buttons, tabs, tables, cards, and navigation items. Do NOT use Lucide icons or raw SVG/emoji icon substitutes unless explicitly requested.

# Mandatory UI/UX Mobile Responsiveness Rule (Strictly Enforced)

- **Automatic Mobile Responsiveness on ANY UI/UX Change**: Whenever ANY UI/UX modification, new feature, screen, modal, card, table, navigation, or design enhancement is made, you MUST AUTOMATICALLY implement it as 100% mobile-responsive across all screen sizes (mobile, tablet, desktop) from the very first edit. Do NOT produce desktop-only or non-responsive code that requires follow-up fixes.
  - **Modals & Dialogs**: ALL modals must be viewport-contained (`max-h-[90vh]` or `max-h-[92vh] flex flex-col`), with fixed/shrink-0 headers & footers, scrollable content bodies (`overflow-y-auto overscroll-contain`), and safe insets (`p-3 sm:p-4`, `inset-x-3.5`).
  - **Dropdowns & Popups**: Custom dropdowns and select menus must stay within the viewport (`max-h-48` to `max-h-56 overflow-y-auto overscroll-contain`), never bleed off screen, and avoid trapping parent scroll.
  - **Tables**: Every tabular view MUST be wrapped in a touch-scrolling container (`overflow-x-auto`) with a safe column minimum width (e.g. `min-w-[640px]`) so columns never squash illegibly or cause page-level horizontal overflow.
  - **Navigation, Tabs & Filter Pills**: Horizontal tabs, filter pills, chips, and category selectors must support smooth touch swiping (`overflow-x-auto no-scrollbar`), flex wrapping, or touch auto-scroll without being clipped or awkwardly truncated.
  - **Touch Targets**: All interactive elements (buttons, inputs, toggles, chips, icon buttons) MUST meet touch-friendly tap target minimums (36px to 44px minimum height/width, e.g., `min-h-[38px] sm:min-h-[40px]`, `w-8 h-8` to `w-10 h-10`).
  - **Responsive Grids & Stacks**: Multi-column grids must adaptively collapse on mobile (e.g., `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `grid-cols-2 lg:grid-cols-4`, `flex-col sm:flex-row`).
  - **Overflow & Text Truncation**: Guard all dynamic text and card titles with `truncate` or `break-words` and responsive text sizing (`text-[10px] sm:text-xs`) to prevent layout blowout on narrow ($<375\text{px}$) devices.

# Mandatory Plans Storage Rule (Strictly Enforced)

- **Auto-Create All Plans Inside `/plans`**: Whenever creating ANY implementation plan, architectural specification, feature roadmap, technical design document, or change proposal, you MUST ALWAYS create and persist the markdown document directly inside the project's root `plans/` directory (e.g. `plans/<feature_name>_plan.md`). Never create plan documents in arbitrary folders, root workspace, or only as ephemeral scratch files without saving them in `plans/`.

# Mandatory New Feature Highlighting Rule (Strictly Enforced)

- **Highlight New Features Upon User Login**: Whenever ANY new feature, module, enhancement, or major capability is added or updated in the CRM:
  - **Register in Feature Highlights Registry**: You MUST immediately register the new feature in the central registry (`src/lib/featureHighlights.ts`) with a unique release ID, title, summary, relevant tags, applicable roles, deep-link URL, and FontAwesome 6 icon.
  - **Automatic Login Spotlight**: The system MUST automatically detect unacknowledged releases and present a 100% mobile-responsive **"What's New / Feature Release Spotlight" Modal** immediately upon user login.
  - **Visual Badges & Pulse Indicators**: Relevant navigation items, tabs, and buttons corresponding to newly added features MUST display visual highlight indicators (e.g. `NEW` badge pills or subtle pulse indicators).
  - **Persistence & User Choice**: Once the user reviews or dismisses the spotlight ("Got it!" / "Don't show again"), save their seen status so they are not repeatedly interrupted on page reloads, while retaining a "What's New" launcher in the top navigation to revisit at will.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
