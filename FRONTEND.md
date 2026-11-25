# FRONTEND.md — ClubFlow PA#3

## 1. Team

| Full name | Student ID |
|---|---|
| Lai Phạm Như Phúc | 24127106 |
| Nguyễn Thục Nghi | 24127207 |
| Trần Văn Nam | 24127459 |

## 2. How to run it

```bash
# terminal 1 — the mock API
node mock/server.mjs

# terminal 2 — the React client (after client/ is added)
cd client
npm ci
npm run dev
```

Preview the production build:

```bash
cd client
npm run build
npx vite preview
```

The client calls only relative `/api` paths. `client/vite.config.js` must proxy
`/api` to `http://localhost:3001` in both `server.proxy` and `preview.proxy`.

The mock starts on `PORT`, default `3001`, and uses only Node's built-in
modules. `MOCK_MODE` selects `normal` (default), `slow`, `error` or `empty`.

## 3. Demo accounts

| Name in examples | Role | E-mail | Password |
|---|---|---|---|
| `exec` | Executive | `exec@clubflow.test` | `exec-demo` |
| `studentA` | Applicant | `studenta@clubflow.test` | `studenta-demo` |
| `studentB` | Applicant | `studentb@clubflow.test` | `studentb-demo` |
| `int-content` | Interviewer (Content) | `int-content@clubflow.test` | `int-content-demo` |
| `int-comms` | Interviewer (Communications) | `int-comms@clubflow.test` | `int-comms-demo` |
| `int-tech` | Interviewer (Technology) | `int-tech@clubflow.test` | `int-tech-demo` |

`studentA` owns applications `A01` (Content) and `A02` (Communications) in
`campaign_001`, plus `A09` created by the contract example.

## 4. Routes

The React client is the next PA#3 implementation step. These are the routes it
will expose; every path below maps to endpoints that already exist in
`docs/api/`.

| Path | Role | Steps | Endpoints |
|---|---|---|---|
| `/` | Visitor | C1 | `GET /api/campaigns` |
| `/campaigns/:campaignId` | Visitor | C1 | `GET /api/campaigns/{campaignId}`, `GET /api/campaigns/{campaignId}/slots` |
| `/sign-in` | Visitor | C2 | `POST /api/auth/login` |
| `/exec/campaigns/new` | Executive | C3 | `POST /api/campaigns`, `POST /api/campaigns/{campaignId}/positions` |
| `/exec/campaigns/:campaignId/edit` | Executive | C3 | `GET /api/campaigns/{campaignId}`, `PATCH /api/campaigns/{campaignId}`, `POST /api/campaigns/{campaignId}/open` |
| `/exec/campaigns/:campaignId/interviewers` | Executive | C4 | `GET /api/interviewers`, `PUT /api/interviewers/{interviewerId}/positions`, `GET/PUT /api/interviewers/{interviewerId}/availability`, `GET /api/rooms` |
| `/apply/:campaignId/:positionId` | Applicant | C5 | `GET /api/campaigns/{campaignId}`, `GET /api/campaigns/{campaignId}/slots`, `POST /api/applications` |
| `/my-applications` | Applicant | C6 | `GET /api/applications/me`, `GET /api/applications/{applicationId}`, `GET /api/applications/{applicationId}/result`, `GET /api/notifications` |
| `/exec/applications` | Executive | C7 | `GET /api/applications`, `GET /api/applications/statistics`, `GET /api/applications/{applicationId}`, `PATCH /api/applications/{applicationId}/screening`, `GET /api/applications/export` |
| `/exec/schedule/:campaignId` | Executive | C8, C9 | `GET /api/campaigns/{campaignId}/schedule`, `POST /api/campaigns/{campaignId}/schedule/generate`, `PATCH /api/schedule/{entryId}`, `POST /api/schedule/{entryId}/resolve`, `POST /api/campaigns/{campaignId}/schedule/entries`, `PUT /api/campaigns/{campaignId}/schedule`, `POST /api/campaigns/{campaignId}/confirm` |
| `/interviewer/interviews` | Interviewer | C10 | `GET /api/interviewers/me/interviews`, `GET /api/applications/{applicationId}`, `GET /api/applications/{applicationId}/cv`, `GET/PUT /api/interviews/{interviewId}/assessment` |
| `/exec/results` | Executive | C11 | `GET /api/applications`, `GET /api/applications/{applicationId}/result`, `PUT /api/applications/{applicationId}/result`, `POST /api/applications/{applicationId}/result/publish` |

A route opened before its data exists (for example `/exec/schedule/:campaignId`
before C8) shows a message, not a blank screen.

## 5. Product owner decisions

No product-owner post is relied on yet. The team follows the brief: an
applicant sees the published result only after the Executive publishes it, and
a rejected application never enters scheduling. Add a link to each post here
before relying on a decision that the brief leaves open.

## 6. Libraries

| Library | Why |
|---|---|
| React + Vite | Required stack for PA#3. |
| React Router (`BrowserRouter`) | Required routing for the main flow. |
| Plain CSS (bundled) | Keeps the PA#2 design system and avoids an external CDN. |

No other dependency is added without asking the team first.

## 7. Not done

- The React client in `client/` is not built yet; this milestone currently
  delivers the contract, the mock and the executable examples.
- The mock keeps uploaded CV bytes only in memory; it does not persist files.
- The mock does not run an optimiser: the draft schedule is fixed seed data,
  with edit/resolve/assign endpoints that recheck overlaps.

## 8. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Added the demo-account table required by `contract-check.mjs` and the planned route map. | Let the tool sign in and document how the routes use the contract. |
