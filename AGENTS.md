# Default Icon System Rule

- **FontAwesome Icons Only**: ALWAYS use FontAwesome 6 icon classes (`<i className="fa-solid fa-..." />`) by default for all UI components, buttons, tabs, tables, cards, and navigation items. Do NOT use Lucide icons or raw SVG/emoji icon substitutes unless explicitly requested.

# Mobile Responsiveness Rule

- **Mobile First & Fully Responsive**: ALL UI components, modals, popups, dropdowns, tables, cards, headers, and views MUST be 100% mobile-responsive across all screen sizes (mobile, tablet, desktop).
  - Floating dialogs, popups, and dropdown menus must adapt seamlessly to mobile viewports (use safe insets like `inset-x-3.5`, max-width containment, and React Portals where necessary to escape parent `transform` or `overflow` traps).
  - Horizontal tab bars, filter pills, and chips must support smooth touch scrolling, active option auto-centering, and never be awkwardly truncated.
  - Ensure all tap targets are touch-friendly (minimum 36-44px), text wraps or truncates safely (`break-words`, `truncate`), and prevent horizontal page overflow.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
