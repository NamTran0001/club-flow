# AI Assistant Prompts (brief.md)

Below are the exact prompts given to our AI assistant in chronological order to build the three ClubFlow prototype screens.

---

## Prompt 1 — Initial System & Screen 1 (`index.html` + `styles.css`)

```text
Read AGENTS.md and the ClubFlow final project brief. Build Screen 1 (`index.html` - Create Recruitment Campaign) and the shared stylesheet (`styles.css`) using plain CSS and semantic HTML5.

Constraints to follow strictly:
1. Stack & Spacing: Use only plain CSS in `styles.css` with custom properties `--space-1` (4px) through `--space-10` (40px). Do not use any magic spacing numbers, `!important`, fixed pixel widths, new dependencies, or JavaScript frameworks. Base body text must be 16px, contrast >= 4.5:1.
2. Mobile-First & Breakpoints: Start with a 1-column mobile layout that works at 360px with no horizontal scroll, then adapt at `768px` (2-column form grids, 3-column summary) and `1024px` (3-column department/position cards for 1280px screens).
3. Tap Targets & Semantics: Every standalone link and button must have `min-height: 44px`. Include `<header>`, `<nav>`, `<main>`, and `<footer>`, exactly one `<h1>`, no skipped heading levels, and a visible `<label for="...">` on every input/textarea.
4. Relative Links & Main Flow: Header nav links must use relative paths (`index.html`, `review.html`, `interview.html`). The campaign form must use `action="review.html" method="get"` with a submit button so it navigates to Screen 2 even with JavaScript disabled.
5. ClubFlow Content & "Fix these" exclusions:
   - Club: CLB Công nghệ thông tin — Campaign: Tuyển thành viên CLB Công nghệ thông tin 2026.
   - Timeline: Opening date `2026-10-15`, Closing date `2026-10-30`.
   - 3 Departments/Positions (Ban Truyền thông - quota 3, Ban Sự kiện - quota 2, Ban Kỹ thuật - quota 2; total quota = 7), including a long Vietnamese position title ("Phát triển website quản lý hoạt động và hệ thống thông tin câu lạc bộ") to verify text wrapping at 360px.
   - Do NOT include "verified student credentials" or template footer text ("© 2025 ClubFlow", Privacy Policy, Terms of Service, Support Center).
6. How done is checked: We will verify the output at 360px, 768px, and 1280px with JavaScript disabled (checking `document.documentElement.scrollWidth > document.documentElement.clientWidth` is `false` and tap targets >= 44px), validate `index.html` for 0 errors in the W3C Nu Html Checker (`validator.w3.org/nu`), and inspect landmarks, heading outline, and input labels in the DevTools Accessibility pane.
```

---

## Prompt 2 — Screen 2 (`review.html` - Application Review)

```text
Following AGENTS.md and `styles.css`, build Screen 2 (`review.html` - Application Review) for the same campaign ("Tuyển thành viên CLB Công nghệ thông tin 2026", closing date 30/10/2026).

Constraints to follow strictly:
1. Correct Page Title & Stack: The `<title>`, breadcrumb, and `<h1>` must clearly state "Duyệt hồ sơ ứng tuyển" (Application Review) — do NOT copy "Create Recruitment Campaign DRAFT MODE". Use only plain CSS and our `--space-*` scale, with no new dependencies, no JavaScript frameworks, and no `!important`.
2. Features Required:
   - Summary statistics cards: 8 Total Applications (from 7 applicants), 2 Pending Review (Chờ duyệt), 5 Shortlisted, 1 Rejected.
   - Search and filter controls (by name/ID, status, position, and sort order) with explicit `<label for="...">` tags, plus a disabled CSV export button.
   - Application table with 8 rows (`A01` to `A08`) wrapped in `.table-scroll` (`overflow-x: auto`, `tabindex="0"`, `role="region"`). Student "Nguyễn Minh Anh" submits two separate applications (`A01` for Ban Truyền thông, `A02` for Ban Kỹ thuật). Include a long Vietnamese applicant name (`A08` - "Nguyễn Hoàng Phương Thảo Như Quỳnh").
   - Application Drawer / Detail panels using native `<details class="app-detail">` elements.
3. Responsive Layout: Wrap the table and the drawer section in `.review-workspace` so they stack vertically at 360px and 768px, and sit side-by-side in 2 columns at 1280px without the drawer covering the list.
4. Navigation: The primary CTA at the bottom ("Tiếp tục: Lịch phỏng vấn →") must be a relative `<a href="interview.html">`.
5. How done is checked: We will test `review.html` at 360px, 768px, and 1280px with JavaScript disabled for zero horizontal page scroll and >= 44px tap targets, run the W3C Nu Html Checker for 0 errors, and verify the semantic tree and form labels in the DevTools Accessibility pane.
```

---

## Prompt 3 — Screen 3 (`interview.html` - Interview Scheduling)

```text
Following AGENTS.md and `styles.css`, build Screen 3 (`interview.html` - Interview Scheduling) for the 5 Shortlisted applications (`A01` to `A05`) from Screen 2.

Constraints to follow strictly:
1. Consistent Timeline & Stack: Set the interview date to `2026-11-05` (after the Oct 30, 2026 application closing date). Time window `09:00` to `12:00`, slot duration `20 phút`. Use only plain CSS and our `--space-*` scale, with no new dependencies or JavaScript frameworks.
2. Non-Overlapping People: List 3 interviewers (Trần Thanh Tùng, Phan Minh Đức, Ngô Ngọc Yến) and 3 rooms (Phòng A, Phòng B, Phòng C). None of the interviewers may share a name with any applicant.
3. Accurate Counts & Real Conflict ("Fix these" list compliance):
   - Exactly 5 Shortlisted applications enter scheduling (`A01`, `A02`, `A03`, `A04`, `A05`).
   - Stat cards, table rows, and hint summary must all add up identically: 5 Shortlisted = 2 Proposed + 2 Conflict + 1 Unassigned.
   - Real Conflict: Assign both `A01` (Ban Truyền thông, Trần Thanh Tùng, Phòng A) and `A02` (Ban Kỹ thuật, Ngô Ngọc Yến, Phòng C) of student "Nguyễn Minh Anh" to the exact same slot (`05/11/2026 · 09:00–09:20`). Highlight both rows as `Conflict` with a `Resolve` button and explain the student overlap in the warning banner.
   - Valid Proposed rows: `A03` (Lê Thu Hà, 09:20–09:40, Trần Thanh Tùng, Phòng A) and `A04` (Phạm Quốc Bảo, 09:20–09:40, Phan Minh Đức, Phòng B) with `Edit` buttons.
   - Unassigned with reason: `A05` (Đỗ Đức Thắng, Ban Kỹ thuật) marked `Unassigned` with explicit reason ("Chưa xếp (Hết ca trống của Ngô Ngọc Yến)") and `+ Assign Slot` button.
   - Confirmation Blocked: Show `Approve & Confirm Schedule` as disabled because conflicts and unassigned applications remain.
4. How done is checked: We will test `interview.html` at 360px, 768px, and 1280px with JavaScript disabled (verifying `.table-scroll` contains table width without page horizontal scroll and buttons are >= 44px tall), check `interview.html` in the W3C Nu Html Checker for 0 errors, and inspect landmarks, headings, and labels in the DevTools Accessibility pane.
```