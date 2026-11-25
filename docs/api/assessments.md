# Assessments API

## 1. Overview

One assessment per completed interview, submitted by the interviewer assigned
to that interview. An Executive may read assessments; only the assigned
interviewer may create or replace one.

Base path: `/api`.

### Assessment object

| Field | Type | Rules |
|---|---|---|
| `id` | string | Server-generated. |
| `interviewId` | string | The confirmed interview. |
| `applicationId` | string | The application being assessed. |
| `interviewerId` | string | The assigned interviewer. |
| `score` | integer | 1–5. |
| `recommendation` | string | `PASS` or `FAIL`. |
| `comments` | string | 0–1000 characters. |
| `submittedAt` | string | ISO 8601. |

An assessment exists only for a confirmed interview. Creating a second one
replaces the first, so `PUT` is idempotent.

## 2. Read an assessment

**Endpoint:** `GET /api/interviews/{interviewId}/assessment`  
**Access:** Executive · assigned Interviewer

### Example

```http
GET /api/interviews/interview_101/assessment
Authorization: Bearer {{token:int-comms}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": {"id": "assessment_101", "interviewId": "interview_101", "applicationId": "application_101", "interviewerId": "u-int-comms", "score": 4, "recommendation": "PASS", "comments": "Giao tiếp tốt, hiểu rõ công việc của ban.", "submittedAt": "2025-11-05T10:00:00+07:00"}}
```

### Example — another interviewer

```http
GET /api/interviews/interview_101/assessment
Authorization: Bearer {{token:int-content}}
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"success": false, "message": "You are not assigned to this interview", "error": {"code": "FORBIDDEN"}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not the assigned interviewer or an Executive. |
| `404` | `INTERVIEW_NOT_FOUND` | No interview has that id. |
| `404` | `ASSESSMENT_NOT_FOUND` | The interview has no assessment yet. |

## 3. Create or replace an assessment

**Endpoint:** `PUT /api/interviews/{interviewId}/assessment`  
**Access:** assigned Interviewer only  
**Content-Type:** `application/json`

| Field | Type | Required | Rules |
|---|---|---:|---|
| `score` | integer | Yes | 1–5. |
| `recommendation` | string | Yes | `PASS` or `FAIL`. |
| `comments` | string | No | 0–1000 characters. |

### Example

```http
PUT /api/interviews/interview_101/assessment
Authorization: Bearer {{token:int-comms}}
Content-Type: application/json

{"score": 5, "recommendation": "PASS", "comments": "Rất phù hợp; nên chuyển sang vòng kết quả."}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Assessment saved", "data": {"id": "assessment_101", "interviewId": "interview_101", "applicationId": "application_101", "interviewerId": "u-int-comms", "score": 5, "recommendation": "PASS", "comments": "Rất phù hợp; nên chuyển sang vòng kết quả.", "submittedAt": "…"}}
```

### Example — draft interview

```http
GET /api/interviews/interview_001/assessment
Authorization: Bearer {{token:int-content}}
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{"success": false, "message": "No assessment exists for this interview", "error": {"code": "ASSESSMENT_NOT_FOUND"}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `score` is not 1–5, `recommendation` is not `PASS`/`FAIL`, or `comments` is too long. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not the assigned interviewer. |
| `404` | `INTERVIEW_NOT_FOUND` | No interview has that id. |
| `409` | `ASSESSMENT_NOT_ALLOWED` | The interview is not confirmed/completed. |

## 4. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Added the assessment resource, field limits and executable examples. | Cover C9 and C10 with one assessment per confirmed interview. |
