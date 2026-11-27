# Results API

## 1. Overview

Manages final Pass/Fail recruitment decisions. An Executive records one final
result per eligible application and publishes it. Once published, the result
becomes visible to the Applicant and an in-app notification is created.

Results are independent for every application, including multiple applications
submitted by the same student.

Base path: `/api`.

### Result object

| Field | Type | Rules |
|---|---|---|
| `applicationId` | string | The related application. |
| `status` | string | `PENDING`, `PASS` or `FAIL`. |
| `published` | boolean | `false` until the Executive publishes the result. |
| `decidedAt` | string or null | ISO 8601 timestamp with timezone offset when a decision is recorded. |
| `publishedAt` | string or null | ISO 8601 timestamp with timezone offset when the result is published. |

### Result business rules

1. Each eligible application can have at most one final result.
2. Final results are independent across applications, even when they belong
   to the same Applicant.
3. Only `Shortlisted` applications with a completed interview and a submitted
   assessment are eligible for a final Pass/Fail decision.
4. An interview must have status `COMPLETED`, not merely `CONFIRMED`.
5. The assessment must belong to the same interview and application.
6. Only an Executive can record or publish a final result.
7. Recording a result does not make it visible to the Applicant.
8. An Applicant can see the final result only after it has been published.
9. A published result cannot be changed.
10. Publishing a result creates one in-app notification for the Applicant who
    owns the related application.
11. Retrying a publish request must not create duplicate notifications.

`Rejected` is a CV screening outcome, not a final recruitment result.
Rejected applications cannot enter interview scheduling and cannot receive
a final Pass/Fail decision through this API.

## 2. Read the final result

**Endpoint:** `GET /api/applications/{applicationId}/result`  
**Access:** Applicant — own application only · Executive

Returns the result associated with the application.

### Visibility rules

- **Applicant:** If the result has not been published, return `PENDING`,
  `published: false`, and null timestamps. An unpublished Executive decision
  must not be exposed.
- **Executive:** Can read the actual recorded decision, even before publication.
  If no decision has been recorded, return `PENDING`.

### Example — published result

```http
GET /api/applications/application_001/result
Authorization: Bearer {{token:studentA}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "applicationId": "application_001",
    "status": "PASS",
    "published": true,
    "decidedAt": "2026-11-06T09:00:00+07:00",
    "publishedAt": "2026-11-06T10:00:00+07:00"
  }
}
```

### Example — not published yet (Applicant)

The Executive has recorded `PASS`, but has not published it. The Applicant
must not see the unpublished decision.

```http
GET /api/applications/application_001/result
Authorization: Bearer {{token:studentA}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "applicationId": "application_001",
    "status": "PENDING",
    "published": false,
    "decidedAt": null,
    "publishedAt": null
  }
}
```

### Example — not decided yet (Executive)

```http
GET /api/applications/application_003/result
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "applicationId": "application_003",
    "status": "PENDING",
    "published": false,
    "decidedAt": null,
    "publishedAt": null
  }
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | An Applicant requests another Applicant's result, or the caller has an unsupported role. |
| `404` | `APPLICATION_NOT_FOUND` | No application has that ID. |

## 3. Record Pass or Fail

**Endpoint:** `PUT /api/applications/{applicationId}/result`  
**Access:** Executive only  
**Content-Type:** `application/json`

Records or replaces an unpublished final decision.

### Request body

| Field | Type | Required | Rules |
|---|---|---:|---|
| `status` | string | Yes | Must be `PASS` or `FAIL`. |

Recording a result does not publish it. Applicants continue to see
`PENDING` until the result is published.

An Executive may update an unpublished decision by sending another valid
request. The existing result ID, if maintained internally, must remain
unchanged. The `decidedAt` timestamp is updated to reflect the latest
recorded decision.

### Example

```http
PUT /api/applications/application_001/result
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{
  "status": "PASS"
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Final result recorded",
  "data": {
    "applicationId": "application_001",
    "status": "PASS",
    "published": false,
    "decidedAt": "2026-11-06T09:00:00+07:00",
    "publishedAt": null
  }
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `status` is missing or is not `PASS` or `FAIL`. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `APPLICATION_NOT_FOUND` | No application has that ID. |
| `409` | `APPLICATION_NOT_ELIGIBLE` | The application is not `Shortlisted`. |
| `409` | `INTERVIEW_NOT_COMPLETED` | The application has no interview with status `COMPLETED`. |
| `409` | `ASSESSMENT_NOT_SUBMITTED` | The completed interview has no submitted assessment. |
| `409` | `RESULT_LOCKED` | The result has already been published. |

## 4. Publish the result

**Endpoint:** `POST /api/applications/{applicationId}/result/publish`  
**Access:** Executive only

Publishes a previously recorded Pass/Fail decision. The result becomes
visible to the Applicant, and the system creates an in-app notification.

The result and its notification must be associated with the same application
and Applicant.

### Example

```http
POST /api/applications/application_001/result/publish
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Result published",
  "data": {
    "applicationId": "application_001",
    "status": "PASS",
    "published": true,
    "decidedAt": "2026-11-06T09:00:00+07:00",
    "publishedAt": "2026-11-06T10:00:00+07:00"
  }
}
```

### Publication rules

1. A Pass/Fail decision must already exist.
2. If the result has not been published, the system publishes it. If it is
   already published, the system returns the existing published result without
   changing it and without creating another notification.
3. On the first successful publication, the system sets `published` to `true`
   and records `publishedAt`.
4. The result becomes visible through the Applicant's result endpoint.
5. On the first successful publication, one `RESULT_PUBLISHED` notification is
   created for the Applicant.
6. Publishing a result for one application must not change another application
   belonging to the same student.
7. The result publication and notification creation must be handled as one
   logical operation. A successful publication must not leave the Applicant
   without the corresponding notification.
8. If a publish request is retried after a successful publication, the system
   must not create another notification. It must return `200 OK` with the
   existing published result.

### Idempotent retry

A repeated publish call is not an error and must not use `409`. Both the first
and every later call answer `200 OK`. The response body is the same published
result, and the Applicant keeps exactly one `RESULT_PUBLISHED` notification.

```json
{
  "success": true,
  "message": "Result already published",
  "data": {
    "applicationId": "application_001",
    "status": "PASS",
    "published": true,
    "decidedAt": "2026-11-06T09:00:00+07:00",
    "publishedAt": "2026-11-06T10:00:00+07:00"
  }
}
```

Frontend and Backend must treat `200 OK` as success on a retry. They must not
show a duplicate-publication warning, and they must not create a second
notification.

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `APPLICATION_NOT_FOUND` | No application has that ID. |
| `409` | `RESULT_NOT_RECORDED` | No Pass/Fail decision has been recorded. |
| `409` | `APPLICATION_NOT_ELIGIBLE` | The application is not eligible for a final result. |
| `409` | `INTERVIEW_NOT_COMPLETED` | The application has no interview with status `COMPLETED`. |
| `409` | `ASSESSMENT_NOT_SUBMITTED` | The completed interview has no submitted assessment. |

`RESULT_ALREADY_PUBLISHED` is deliberately not an error code. A retry after a
successful publication returns `200 OK` as described above.

## 5. Authorization rules

1. Only authenticated Applicants and Executives can read results.
2. Applicants can read only results belonging to their own applications.
3. Applicants can only see published final decisions.
4. Executives can read recorded decisions before and after publication.
5. Only Executives can record or publish results.
6. Interviewers cannot record, publish, or read final recruitment decisions.
7. The backend must enforce application ownership and role checks for every
   protected operation.

## 6. Cross-API dependencies

| Related API | Dependency |
|---|---|
| `auth.md` | Provides authenticated user identity and role-based access control. |
| `campaigns.md` | Defines the `CONFIRMED` → `COMPLETED` transition, which requires every result to be recorded and published. |
| `applications.md` | Provides application ownership and screening status. |
| `schedules.md` | Provides the interview record and its `COMPLETED` status. |
| `assessments.md` | Provides the assessment required before a final decision can be recorded. |
| `notifications.md` | Creates one `RESULT_PUBLISHED` notification when a result is published. |

The Results API must use the same `applicationId` and interview relationship
as the Applications, Schedules, and Assessments APIs.

## 7. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Added final-result read, record and publish endpoints. | Cover C10 and keep results independent per application. |
| 2026-11-25 | Added eligibility checks, assessment requirement, Applicant visibility rules, authorization errors and notification idempotency. | Align final-result handling with the official requirements and related API contracts. |
| 2026-11-25 | Made publish retries explicitly idempotent: a repeated publish returns `200 OK` with the existing result and never creates a second notification. | Give Frontend and Backend one unambiguous retry behavior instead of a possible `409` versus `200` split. |
