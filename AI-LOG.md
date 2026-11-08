# AI Collaboration Log (AI-LOG.md)

## Entry 1 — Project Rules & Base Stylesheet (`AGENTS.md`, `styles.css`)
- **Tool:** Gemini
- **Request:** Define project constraints in `AGENTS.md` and create a mobile-first stylesheet (`styles.css`) with a strict custom-property spacing scale (`--space-1` to `--space-10`), 16px body font size, >= 4.5:1 contrast ratio, and >= 44px tap targets.
- **Changed:** Checked `--space-*` usage by reading `styles.css`, 3 widths in DevTools, and the colour picker for contrast; found no problem.
- **Rejected:** Rejected the assistant's suggestion to load Google Fonts (`Inter`) from a CDN so the prototype works 100% offline.

## Entry 2 — Screen 1: Create Recruitment Campaign (`index.html`)
- **Tool:** Gemini
- **Request:** Build `index.html` covering campaign overview, opening/closing dates (`2026-10-15` to `2026-10-30`), application instructions, 3 departments/positions (total quota 7), and form navigation to `review.html`.
- **Changed:** At `1280px` width, the 3 position `<fieldset>` blocks initially stayed stacked in a single full-width column. Caught during our `1280px` DevTools viewport check (Criterion 2 requires multi-column adaptation on wide screens). We asked the assistant to wrap the three fieldsets in `.positions-grid` (`grid-template-columns: repeat(3, minmax(0, 1fr))` at `@media (min-width: 1024px)`) and added a `+ Thêm vị trí (mô phỏng)` button. Verified 0 errors in the W3C Nu Html Checker and checked `<fieldset>`/`<legend>` and `<label>` associations in the DevTools Accessibility pane.
- **Rejected:** Rejected placeholder text that mentioned "complete verified student credentials" because university account verification is under *Not Building* in the ClubFlow brief.

## Entry 3 — Screen 2: Application Review (`review.html`)
- **Tool:** Gemini
- **Request:** Build `review.html` with campaign statistics (8 applications from 7 applicants: 5 Shortlisted, 2 Pending, 1 Rejected), filter controls, an 8-row application table, and accessible application drawers using `<details>`.
- **Changed:**
  1. When testing with JavaScript disabled (`Ctrl+Shift+P` -> `Disable JavaScript`) and inspecting the DevTools Accessibility pane, all `<details class="app-detail">` elements were collapsed by default, hiding the motivation statement, CV attachment, reviewer notes `<textarea>`, and `Shortlist Candidate` / `Reject` buttons from users. We added the `open` attribute to all `<details>` elements (`#a01` through `#a08`) so that every applicant review drawer is fully expanded and clickable by default, and wrapped all drawer items inside a `<section class="panel">` with an `<h2>` heading so the heading outline never skips a level. We fixed it ourselves.
  2. Added `.review-workspace` to place the application table and the application drawer side-by-side at `1280px` while keeping both readable at every width.
- **Rejected:** Rejected a fixed-position overlay drawer that covered the application table on desktop screens.

## Entry 4 — Screen 3: Interview Scheduling (`interview.html`)
- **Tool:** Gemini
- **Request:** Build `interview.html` for the 5 Shortlisted applications (`A01`–`A05`) on `2026-11-05` with interviewer/room lists, draft schedule table, conflict detection, and confirmation gate.
- **Changed:** The first draft had `4 Proposed`, `1 Unassigned`, and `0 Conflict`, and omitted the per-row Action column (`Edit`, `Resolve`, `+ Assign Slot`). Caught when cross-checking against Section 3.2 (Step 4) and Section 3.4 of the ClubFlow brief. We updated the schedule so student `Nguyễn Minh Anh` has both `A01` and `A02` scheduled at `09:00–09:20` on `05/11/2026`, creating a genuine 2-row student overlap (`2 Proposed + 2 Conflict + 1 Unassigned = 5 Shortlisted`) and added the `Thao tác` action column.
- **Rejected:** Rejected sample interviewer names that overlapped with applicant names (`Trần Gia Huy`, `Hoàng Thảo Vy`).