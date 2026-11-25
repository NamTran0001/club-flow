# ClubFlow PA#3 — Requirements Audit and API Cross-Review

**Course:** CSC13008 — 24KTPM1  
**Milestone:** PA#3 — API Contract + Mock Server  
**Date:** 2026-11-25  
**Sources:** Official ClubFlow Final Project Brief, PA#3 rubric, `contract-check.mjs`
and its README, `AGENTS.md`, the PA#2 screens (`index.html`, `review.html`,
`interview.html`, `styles.css`).

---

## 1. Functional requirements C1–C11

The brief groups the work into eleven functional categories. The identifiers
C1–C11 are the team's organisational labels, not official requirement IDs.

| ID | Requirement | Primary actor | Contract coverage |
|---|---|---|---|
| C1 | Authentication and role-based authorization | All users | `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` |
| C2 | Public campaign browsing | Visitor, Applicant | `GET /api/campaigns`, `GET /api/campaigns/{id}`, `GET /api/campaigns/{id}/slots` |
| C3 | Campaign creation, configuration and publication | Executive | `POST/PATCH /api/campaigns…`, position CRUD, `open`, `close`, `confirm` |
| C4 | Interviewer assignment, availability and rooms | Executive | `GET /api/interviewers`, `PUT …/positions`, `GET/PUT …/availability`, `GET /api/rooms` |
| C5 | Application submission with CV and motivation | Applicant | `POST /api/applications` (multipart), campaign slots |
| C6 | Applicant tracking of status, interview and result | Applicant | `GET /api/applications/me`, application detail, result, notifications |
| C7 | CV screening, search, statistics and export | Executive | `GET /api/applications`, `PATCH …/screening`, `…/statistics`, `…/export`, `…/cv` |
| C8 | Interview scheduling, conflicts and confirmation | Executive | schedule read/generate/edit/resolve/assign/save/export, `confirm` |
| C9 | Interview assessment | Interviewer | `GET/PUT /api/interviews/{id}/assessment` |
| C10 | Final results and in-app notifications | Executive, Applicant | `GET/PUT /api/applications/{id}/result`, `…/result/publish`, `GET/PATCH /api/notifications` |
| C11 | Interviewer workspace | Interviewer | `GET /api/interviewers/me/interviews`, assigned application and CV, assessment |

Detailed rules for each category are in `docs/api/requirements.md` (sections
1.1–1.11) and were used as the acceptance criteria for the contract.

### 1.1 Requirement rules that shaped the contract

- **C1:** pre-created accounts only; no registration, recovery or SSO; the
  backend enforces role, ownership and assignment checks on every protected
  operation.
- **C2:** visitors see only published campaigns; drafts are hidden and refused
  with `403`.
- **C3:** required fields and valid dates are checked before publication; only
  one campaign may be `OPEN`; a confirmed campaign is read-only.
- **C4:** interviewers are pre-created users with the `INTERVIEWER` role;
  departments are organisational units, not roles; the Executive enters
  availability; rooms come from a fixed list.
- **C5:** CV must be PDF ≤ 5 MB; motivation ≤ 300 words; one application per
  position per campaign, with duplicate submissions returned rather than
  duplicated; a student may hold several applications in one campaign.
- **C6:** applicants read only their own records and never internal notes.
- **C7:** screening decisions are independent per application; shortlisted is
  not accepted; rejected applications never enter scheduling; internal notes are
  Executive-only.
- **C8:** only shortlisted applications are scheduled; one interview per
  application; one interviewer and one room per interview; applicant,
  interviewer and room overlaps are all conflicts; unassignable applications
  keep a specific reason; confirmation requires a closed campaign, fully
  reviewed applications, and no unassigned or conflicting entry.
- **C9:** one assessment per completed interview; only the assigned interviewer
  may submit it.
- **C10:** Pass/Fail is independent per application; publishing notifies only the
  matching applicant and never changes another application of the same student.
- **C11:** interviewers see only their assigned confirmed interviews and the
  matching CVs; they cannot browse all applications or decide results.

---

## 2. Actors and access rights

| Actor | Authentication | Rights |
|---|---|---|
| Visitor | None | Read published campaigns, campaign details and interview slots |
| Executive | `EXECUTIVE` | Full campaign, interviewer, application, schedule and result management |
| Applicant | `APPLICANT` | Submit applications; read and track only their own applications, results and notifications |
| Interviewer | `INTERVIEWER` | Read own assignments and confirmed interviews; read the assigned applications and CVs; submit assessments |

Cross-cutting access rules enforced by the contract and the mock:

1. Role checks happen before body parsing, so a wrong role gets `403`, not a
   validation error.
2. Ownership checks use the token, never a client-supplied `applicantId` or
   `interviewerId`.
3. Interviewer access requires an assignment on the specific interview; a
   qualified interviewer assigned to a different position is still refused.
4. `internalNotes` is omitted from Applicant and Interviewer answers.
5. `SCHEDULE_ALREADY_CONFIRMED`, `CAMPAIGN_LOCKED` and `APPLICATION_LOCKED`
   protect the post-confirmation read-only state.
6. Confirmation does not block assessments or final results.

The full function-by-actor matrix is in `docs/api/requirements.md` section 2.2
and the per-endpoint access column is in `docs/api/README.md` section 6.

---

## 3. End-to-end business flow

| Step | Requirement | Actor | Contract actions |
|---:|---|---|---|
| 1 | C1 | All users | Sign in; receive a bearer token; `/auth/me` restores the session |
| 2 | C2 | Visitor / Applicant | Browse published campaigns, details and interview slots |
| 3 | C3 | Executive | Create a draft, configure positions/quotas/dates, publish |
| 4 | C4 | Executive | Assign interviewers to positions, set availability, review rooms |
| 5 | C5 | Applicant | Submit one application per position with PDF CV and availability |
| 6 | C6 | Applicant | Track screening status, interview and final result |
| 7 | C7 | Executive | Search, filter, read CVs, add internal notes, shortlist or reject |
| 8 | C8 | Executive | Generate a draft, fix conflicts/unassigned rows, save, confirm |
| 9 | C11 | Interviewer | See confirmed assigned interviews and read the assigned CVs |
| 10 | C9 | Interviewer | Submit one assessment per completed interview |
| 11 | C10 | Executive / Applicant | Record and publish Pass/Fail; applicant receives a notification |

### 3.1 State separation

The contract keeps three state machines apart, because the brief treats mixing
them as an error:

- CV screening: `PENDING` → `SHORTLISTED` or `REJECTED`.
- Interview: `PROPOSED`, `UNASSIGNED`, `CONFLICT` → `CONFIRMED`.
- Final result: `PENDING` → `PASS` or `FAIL`, then `published: true`.

`SHORTLISTED` means only that the CV passed; it is not an acceptance and does
not by itself confirm an interview.

### 3.2 Worked example used by the contract and the mock

Campaign `campaign_001` opens 2026-10-15, closes 2026-10-30, and interviews on
2026-11-05 from 09:00 to 12:00 in 20-minute slots, with three positions and a
total quota of 7. Eight applications arrive (A01–A08). A01 and A02 are the same
student (Nguyễn Minh Anh) applying to Content and Communications; both are
placed at 09:00–09:20, which is a genuine conflict. A05 has no common free slot
with the Technology interviewer and stays `UNASSIGNED` with a stated reason.
A06 is still awaiting screening. This produces exactly the blockers the brief
requires: unreviewed applications, one real conflict pair, and one unassigned
application.

---

## 4. “Fix These” audit

The brief lists eight sample defects. Each was checked against the PA#2 screens
and the PA#3 data.

| # | Defect | Evidence in this project | Verdict |
|---:|---|---|---|
| 1 | Inconsistent timeline | `index.html` shows applications `15/10/2026 – 30/10/2026`; `review.html` shows the same closing date `30/10/2026`; `interview.html` uses `05/11/2026`, after closing. API seed uses `2026-10-15T00:00:00+07:00` → `2026-10-30T23:59:59+07:00` and `interviewDate: 2026-11-05`. | Pass |
| 2 | Wrong page title | `review.html` `<title>` and `<h1>` are `Duyệt hồ sơ ứng tuyển`; the campaign-creation title `Create Recruitment Campaign · DRAFT MODE` appears nowhere. | Pass |
| 3 | Drawer covers the list | The review workspace is a single column below 1024px and a two-column `minmax(0, 1.25fr) minmax(0, 1fr)` grid from 1024px (`styles.css`), so the list remains visible beside the details. | Pass |
| 4 | Incorrect counts | `interview.html` shows 2 Proposed, 2 Conflict, 1 Unassigned, and its footer states `2 + 2 + 1 = 5` shortlisted rows. The API schedule computes `summary` from the entries on every read, edit, resolve and assign. | Pass |
| 5 | Fake conflict | A01 and A02 belong to the same applicant and share 09:00–09:20 on 2026-11-05, so the conflict is real. The mock recomputes conflicts from applicant, interviewer and room overlaps rather than from the date alone. | Pass |
| 6 | People overlap | Applicants are Nguyễn Minh Anh, Lê Thu Hà, Phạm Quốc Bảo, Đỗ Đức Thắng, Võ Mai Linh, Bùi Quang Huy, Nguyễn Hoàng Phương Thảo Như Quỳnh; interviewers are Phan Minh Đức, Trần Thanh Tùng, Ngô Ngọc Yến. The sets are disjoint, and neither Trần Gia Huy nor Hoàng Thảo Vy is reused. | Pass |
| 7 | Verified claims | No “Verified”, “Verified Student”, “100% verified”, “Verified Attachments” or “Verified Credentials” text exists in the pages or the data; statuses use Submitted, CV Uploaded, Shortlisted, Rejected. | Pass |
| 8 | Template footer | The footer reads `ClubFlow · Bản mẫu giao diện PA#2 · Dữ liệu minh họa, không lưu thay đổi`; there is no `© 2025 ClubFlow`, Privacy Policy, Terms of Service or Support Center. | Pass |

The one nuance worth recording: the PA#2 prototype shows five shortlisted
applications (A01–A05), while the PA#3 seed adds three more (A06–A08) so that
screening, statistics and the confirmation blockers are testable. The counts
stay derived from the rows in both cases; no hardcoded totals are displayed.

---

## 5. API cross-review

### 5.1 Problems found in the first contract draft

| Area | Finding | Resolution |
|---|---|---|
| Endpoint inventory | `README.md` had no endpoint table, and rooms, slots, schedule, assessment, result and notification endpoints were missing | Added a 44-row table and the missing resource files |
| URLs and methods | Some actions were described as `POST` on the resource itself; schedule entries and room listing had no route | Standardised on `POST` action sub-paths (`/open`, `/close`, `/confirm`, `/resolve`) and `PATCH`/`PUT` for replacement |
| Request JSON | Campaign body lacked `clubName`, `instructions` and position `quota`; interviewer assignment had no `campaignId` | Added the missing fields, limits and required flags |
| Response JSON | Shapes mixed bare objects, `{data}` and ad-hoc error objects; lists had no pagination | One success envelope (`success`, `data`, optional `message`/`pagination`) and one error envelope (`success`, `message`, `error.code`, optional `error.details`) |
| Status codes | `200` was used for creation, and business refusals were undocumented | `201` for creation, `400` validation, `401` auth, `403` role/ownership, `404` missing resource, `409` business state |
| Validation | No field-level detail format and no CV/motivation limits | Documented limits and the `details` object, e.g. `{"applicationEndDate": "Must be after applicationStartDate"}` |
| Access rights | Endpoints were described without an access column; ownership and assignment rules were implicit | Added per-endpoint access and explicit rules for own-resource and assigned-interviewer access |
| Executability | No examples, no `## Changes`, no demo-account table, no `FRONTEND.md` | Added 57 executable examples, `## Changes` to every file, the demo-account table and `FRONTEND.md` |

### 5.2 Consistency rules now enforced across the contract

1. Every path starts with `/api`; collection resources are plural; identifiers
   are opaque strings such as `campaign_001`.
2. Reads use `GET`; creation uses `POST`; partial updates use `PATCH`; full
   replacements use `PUT`; deletion uses `DELETE`.
3. Success always contains `success: true`; a mutation also contains
   `message`; a list also contains `pagination` with `page`, `limit`,
   `totalItems`, `totalPages`.
4. Every failure contains `success: false`, `message`, and `error.code`;
   validation failures add `details` keyed by field.
5. `401` is reserved for a missing/invalid token; `403` is authenticated but
   not allowed; `404` is a missing resource; `409` is a business-rule refusal.
6. Timestamps use the Vietnam offset; `interviewDate`, schedule `date` and
   filters use `YYYY-MM-DD`.
7. Every endpoint in the table has at least one example, and every example uses
   an endpoint in the table (verified mechanically).
8. All examples run in one deterministic order on a freshly started mock, so
   the contract doubles as an integration test.

### 5.3 Per-endpoint access review

| Resource group | Public | Executive | Applicant | Interviewer |
|---|---|---|---|---|
| Campaigns read | Published only | All | Published only | Published only |
| Campaigns write / confirm | — | Yes | — | — |
| Interviewers and availability | — | Yes | — | Own profile and own availability |
| Applications submit | — | — | Yes | — |
| Applications list / statistics / export / screening | — | Yes | — | — |
| Application detail / CV | — | Yes | Own only | Assigned only |
| Schedule and rooms | — | Yes | — | — |
| Own interviews / assignments | — | — | — | Yes |
| Assessments read | — | Yes | — | Assigned only |
| Assessments write | — | — | — | Assigned only |
| Results read | — | Yes | Own only | — |
| Results write / publish | — | Yes | — | — |
| Notifications | — | — | Own only | — |

---

## 6. Mock server

**Files**

| File | Purpose |
|---|---|
| `mock/server.mjs` | HTTP router, auth, validation, state and all 44 endpoints |
| `mock/data/users.json` | Demo accounts |
| `mock/data/campaigns.json` | `campaign_001` (2026, open) and `campaign_002` (2025, confirmed) |
| `mock/data/applications.json` | A01–A08 plus the 2025 application |
| `mock/data/interviewers.json` | Three interviewers, assignments and availability |
| `mock/data/rooms.json`, `slots.json`, `schedule.json` | Rooms, public slots and the draft/confirmed schedules |
| `mock/data/assessments.json`, `results.json`, `notifications.json` | Seeded C9/C10 data |

**Behaviour**

- Node built-ins only (`node:http`, `node:fs`, `node:path`, `node:url`); no
  dependency is installed or loaded.
- Listens on `PORT`, default `3001`.
- Tokens are stateless: `token-<userId>`, so they survive a restart.
- Keeps changes in memory and reseeds from `mock/data/` on restart.
- Prints exactly one line per request: `METHOD /path status`.
- CV uploads are parsed from `multipart/form-data`; the PDF signature, extension
  and 5 MB limit are checked.
- Schedule conflicts are recomputed from actual applicant, interviewer and room
  overlaps after every edit, resolve or manual assignment.

**Modes** (`MOCK_MODE`)

| Mode | Behaviour |
|---|---|
| `normal` (default) | ~150 ms delay |
| `slow` | ~2 s delay, for loading states |
| `error` | `500 INTERNAL_SERVER_ERROR` for everything except sign-in |
| `empty` | Every array becomes `[]` and count fields become `0`; single objects still answer |

Verified: `error` keeps sign-in working and returns the standard error shape;
`empty` returns `[]` with zeroed pagination; `slow` answers in ~2 s.

**Run**

```bash
node mock/server.mjs
# optional
PORT=3001 MOCK_MODE=slow node mock/server.mjs
```

PowerShell: `$env:MOCK_MODE="slow"; node mock/server.mjs`.

---

## 7. Contract check result

Command:

```bash
node tools/contract-check.mjs --base http://localhost:3001 --repo .
```

Result on a freshly started mock:

```text
contract-check — 57 example(s) in 10 file(s) of docs\api, sent to http://localhost:3001
...
57/57 examples answered as written; 0 FAIL line(s)
PASS  README.md  every endpoint in the table has an example (44/44)
```

Remaining notes are informational only:

- A list example shows one row while the answer contains five; the example is
  abbreviated on purpose and the row values agree.
- CSV and PDF examples declare only headers, so the checker notes that a body
  was returned.

Neither is a contract mismatch: the status, content type and fields agree.

---

## 8. Open items

1. **Team approval before commit.** `docs/api/`, `mock/`, `tools/` and
   `FRONTEND.md` are untracked. The brief requires the contract to be agreed by
   the whole team before it is committed; no commit has been made yet.
2. **React client.** `client/` does not exist yet. `FRONTEND.md` lists the
   planned routes and the endpoints each route uses, but no screen is built.
3. **Production API.** The contract is implemented only by the mock; the later
   Express server must match it and must keep the same access rules.
4. **Mock persistence.** Uploaded CV bytes and all mutations are in memory and
   are lost on restart, by design.

---

## 9. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Recorded C1–C11, actors, access rights, business flow, the eight-item Fix These audit, the API cross-review and the mock/check results. | Give the team one reviewable PA#3 record and show that the contract and mock agree. |
