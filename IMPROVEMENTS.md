# Lumora Personal — audit & improvements

Date: 2026-09-28 (Asia/Amman). Local smoke URL: `http://127.0.0.1:8765/`.

## What changed (this pass)

### Code structure
- Split the ~250KB / 6.3k-line monolithic `app.js` IIFE into ES modules under `js/` (still static, GitHub Pages–compatible with relative paths, no bundler).
- Data catalogs extracted: Lila starter, presets/tiles/pills, agent skills, wizard chips, captions/checklist, storage key config.
- Entry is `js/app.js` loaded via `<script type="module">`.

### UI / information architecture
- Workspace nav regrouped into **Look → Create → Plan → Agent**, with secondary tabs filtered per group (was 8 crowded tabs).
- Mobile topbar: hide Export/Import/personal note under 640px (still available in the drawer) so Studio + menu fit.

### Compatibility preserved
- `aips_*` localStorage keys unchanged.
- `char_lila_bloom` starter merge behavior unchanged (58 starter prompts).
- Adult Soft / Suggestive / NSFW flows kept.

## Prioritized findings (remaining)

### P1 — maintainability
- `js/app.js` is still chunked (~5.5k lines). Next incremental extracts: `storage.js`, `generate/bluesminds.js`, `agent/chat.js`, `ui/workspace.js`.
- `style.css` (~50KB) could split into `css/base.css` + `workspace.css` + `agent.css` with multiple `<link>`s (avoid `@import` for perf).

### P2 — UX / mobile
- Generate panel is dense (style pack, presets, dress/duo, storyboard, movie pack, advanced). Consider default-collapsed “advanced tools” and a clearer primary CTA stack.
- Sticky bible actions can feel early on short viewports; verify safe-area + sticky offsets on iPhone.
- Character cards use letter avatars only — optional hero-face thumbnail on the dashboard when a primary face pack exists.

### P3 — a11y / polish
- Wire `aria-controls` from tabs to `panel-*` ids; ensure focus moves into the active panel on tab change.
- Marquee is decorative (already `aria-hidden`); confirm reduced-motion respects pause (partially present).
- Dialogs (`<dialog>`) — confirm Esc + focus trap on all three modals across Safari iOS.

### P4 — performance
- First load still pulls all agent skills + Lila NSFW prompt library up front. Optional: dynamic `import()` for agent-skills / NSFW prompt packs after first paint.
- Compress / cache fonts; Unbounded + Fontshare are render-path critical.

### P5 — product decisions (human)
- Images and Agent chat are BluesMinds-only (Horde/Pollinations/Flux removed from active Generate paths).
- Whether Agent “Video engine” stays a stub or gets a free path.
- Whether to version `IMPROVEMENTS.md` into GitHub Issues.

## How to verify

1. `python3 -m http.server 8765 --bind 127.0.0.1` from the repo root.
2. Open `http://127.0.0.1:8765/` — landing loads.
3. Open Studio — Lila Bloom card shows (~58 prompts).
4. Open Lila — **Look / Create / Plan / Agent** groups; Bible under Look; Generate under Create.
5. Export JSON, reload, confirm characters persist (`aips_characters`).
6. Screenshots from this pass (optional): `_screenshots/home-mobile.png`, `_screenshots/home-budget.png`, `_screenshots/studio-lila.png`.

## Out of scope / not done
- No push to GitHub.
- No bundler (Vite/Rollup) — not required for Pages.
- No feature removal of adult content.
