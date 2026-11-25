# Results API

## 1. Overview

Final Pass/Fail decisions. An Executive records one result per application and
publishes it; the applicant then sees it and receives an in-app notification.
The result is independent for every application, including two applications
from the same student.

Base path: `/api`.

### Result object

| Field | Type | Rules |
|---|---|---|
| `applicationId` | string | The application. |
| `status` | string | `PENDING`, `PASS` or `FAIL`. |
| `published` | boolean | `false` until the Executive publishes. |
| `decidedAt` | string or null | ISO 8601 when a decision was recorded. |
| `publishedAt` | string or null | ISO 8601 when it was published. |

## 2. Read the final result

**Endpoint:** `GET /api/applications/{applicationId}/result`  
**Access:** Applicant own · Executive

### Example — published result

```http
GET /api/applications/application_101/result
Authorization: Bearer {{token:studentB}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": {"applicationId": "application_101", "status": "PASS", "published": true, "decidedAt": "2025-11-06T09:00:00+07:00", "publishedAt": "2025-11-06T10:00:00+07:00"}}
```

### Example — not decided yet

```http
GET /api/applications/application_003/result
Authorization: Bearer {{token:studentB}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": {"applicationId": "application_003", "status": "PENDING", "published": false, "decidedAt": null, "publishedAt": null}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | Another applicant asks for this result. |
| `404` | `APPLICATION_NOT_FOUND` | No application has that id. |

## 3. Record Pass or Fail

**Endpoint:** `PUT /api/applications/{applicationId}/result`  
**Access:** Executive only  
**Content-Type:** `application/json`

| Field | Type | Required | Rules |
|---|---|---:|---|
| `status` | string | Yes | `PASS` or `FAIL`. |

Recording a result does not publish it. The applicant still sees `PENDING`
until publication.

### Example

```http
PUT /api/applications/application_003/result
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{"status": "PASS"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Final result recorded", "data": {"applicationId": "application_003", "status": "PASS", "published": false, "decidedAt": "…", "publishedAt": null}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `status` is not `PASS` or `FAIL`. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `APPLICATION_NOT_FOUND` | No application has that id. |
| `409` | `RESULT_LOCKED` | The result is already published. |
| `409` | `INTERVIEW_NOT_COMPLETED` | The interview is not confirmed/completed. |

## 4. Publish the result

**Endpoint:** `POST /api/applications/{applicationId}/result/publish`  
**Access:** Executive only

Publishing makes the result visible to the applicant and creates an in-app
notification. Publishing one application never changes another application of
the same student.

### Example

```http
POST /api/applications/application_003/result/publish
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Result published", "data": {"applicationId": "application_003", "status": "PASS", "published": true, "decidedAt": "…", "publishedAt": "…"}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `APPLICATION_NOT_FOUND` | No application has that id. |
| `409` | `RESULT_NOT_RECORDED` | No Pass/Fail decision has been recorded. |
| `409` | `RESULT_ALREADY_PUBLISHED` | The result is already published. |

## 5. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Added final-result read, record and publish endpoints. | Cover C10 and keep results independent per application. |
