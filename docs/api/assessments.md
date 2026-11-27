# Assessments API

## 1. Overview

One assessment per completed interview, submitted by the interviewer assigned to that interview.

An assigned Interviewer may create or replace an assessment. An Executive may read assessments but cannot create or modify them.

Base path: `/api`.

### Interview status requirements

The interview lifecycle distinguishes between a confirmed appointment and a completed interview:

| Interview status | Meaning | Assessment allowed |
|---|---|---:|
| `PROPOSED` | A proposed interview appointment that has not been confirmed. | No |
| `CONFIRMED` | The interview date, time and room have been confirmed. | No |
| `COMPLETED` | The interview has taken place and has been marked as completed. | Yes |
| `CONFLICT` | The interview appointment has a scheduling conflict. | No |

An assessment can only be created or replaced when the interview status is `COMPLETED`.

`CONFIRMED` means that an appointment has been scheduled. It does not mean that the interview has already taken place.

The interview completion operation must be provided by the Schedule API. This API does not change interview status.

### Assessment object

| Field | Type | Rules |
|---|---|---|
| `id` | string | Server-generated. |
| `interviewId` | string | The completed interview being assessed. |
| `applicationId` | string | The application being assessed. |
| `interviewerId` | string | The interviewer assigned to the interview. |
| `score` | integer | 1–5. |
| `recommendation` | string | `PASS` or `FAIL`. |
| `comments` | string | 0–1000 characters. |
| `submittedAt` | string | ISO 8601. |

There is at most one assessment per interview.

Creating an assessment for the first time creates a record. Sending another `PUT` request replaces the existing assessment. Therefore, `PUT` is idempotent.

## 2. Read an assessment

**Endpoint:** `GET /api/interviews/{interviewId}/assessment`  
**Access:** Executive · assigned Interviewer

The assigned Interviewer and Executives may read an existing assessment.

An assessment is available only after it has been submitted. If the interview is completed but no assessment has been submitted, the endpoint returns `404 ASSESSMENT_NOT_FOUND`.

### Example

```http
GET /api/interviews/interview_001/assessment
Authorization: Bearer {{token:int-content}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "id": "assessment_001",
    "interviewId": "interview_001",
    "applicationId": "application_001",
    "interviewerId": "u-int-content",
    "score": 4,
    "recommendation": "PASS",
    "comments": "Giao tiếp tốt, hiểu rõ công việc của ban.",
    "submittedAt": "2026-11-05T09:30:00+07:00"
  }
}
```

### Example — another interviewer

```http
GET /api/interviews/interview_001/assessment
Authorization: Bearer {{token:int-comms}}
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "success": false,
  "message": "You are not assigned to this interview",
  "error": {
    "code": "FORBIDDEN"
  }
}
```

### Example — assessment not submitted yet

```http
GET /api/interviews/interview_001/assessment
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "success": false,
  "message": "No assessment exists for this interview",
  "error": {
    "code": "ASSESSMENT_NOT_FOUND"
  }
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is neither an Executive nor the assigned Interviewer. |
| `404` | `INTERVIEW_NOT_FOUND` | No interview has that ID. |
| `404` | `ASSESSMENT_NOT_FOUND` | The interview has no assessment yet. |

## 3. Create or replace an assessment

**Endpoint:** `PUT /api/interviews/{interviewId}/assessment`  
**Access:** Assigned Interviewer only  
**Content-Type:** `application/json`

The Interviewer must be assigned to the specified interview, and the interview must have status `COMPLETED`.

### Request fields

| Field | Type | Required | Rules |
|---|---|---:|---|
| `score` | integer | Yes | 1–5. |
| `recommendation` | string | Yes | `PASS` or `FAIL`. |
| `comments` | string | No | 0–1000 characters. |

### Example — create an assessment

```http
PUT /api/interviews/interview_001/assessment
Authorization: Bearer {{token:int-content}}
Content-Type: application/json

{
  "score": 5,
  "recommendation": "PASS",
  "comments": "Rất phù hợp; nên chuyển sang vòng kết quả."
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Assessment saved",
  "data": {
    "id": "assessment_001",
    "interviewId": "interview_001",
    "applicationId": "application_001",
    "interviewerId": "u-int-content",
    "score": 5,
    "recommendation": "PASS",
    "comments": "Rất phù hợp; nên chuyển sang vòng kết quả.",
    "submittedAt": "2026-11-05T09:30:00+07:00"
  }
}
```

### Example — replace an existing assessment

```http
PUT /api/interviews/interview_001/assessment
Authorization: Bearer {{token:int-content}}
Content-Type: application/json

{
  "score": 4,
  "recommendation": "PASS",
  "comments": "Bổ sung nhận xét sau khi rà soát lại buổi phỏng vấn."
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Assessment replaced successfully",
  "data": {
    "id": "assessment_001",
    "interviewId": "interview_001",
    "applicationId": "application_001",
    "interviewerId": "u-int-content",
    "score": 4,
    "recommendation": "PASS",
    "comments": "Bổ sung nhận xét sau khi rà soát lại buổi phỏng vấn.",
    "submittedAt": "2026-11-05T09:45:00+07:00"
  }
}
```

The assessment ID remains unchanged when replacing an existing assessment. The `submittedAt` value is updated to the latest successful submission time.

### Example — interview not completed

A confirmed appointment cannot be assessed before the interview takes place.

```http
PUT /api/interviews/interview_001/assessment
Authorization: Bearer {{token:int-content}}
Content-Type: application/json

{
  "score": 5,
  "recommendation": "PASS",
  "comments": "Buổi phỏng vấn diễn ra tốt."
}
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "success": false,
  "message": "The interview has not been completed",
  "error": {
    "code": "INTERVIEW_NOT_COMPLETED"
  }
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `score` is not an integer from 1–5, `recommendation` is not `PASS` or `FAIL`, or `comments` exceeds 1000 characters. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not the Interviewer assigned to this interview. |
| `404` | `INTERVIEW_NOT_FOUND` | No interview has that ID. |
| `409` | `INTERVIEW_NOT_COMPLETED` | The interview status is not `COMPLETED`. |

## 4. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Added the assessment resource, field limits and executable examples. | Cover C9 and C10 with one assessment per completed interview. |
| 2026-11-25 | Replaced the `interview_101` / `application_101` examples with `interview_001` / `application_001` from the 2026 campaign dataset. | Keep examples consistent with the active `campaign_001` data. |
| 2026-11-25 | Distinguished `CONFIRMED` from `COMPLETED` and restricted assessment submission to completed interviews. | Prevent interviewers from submitting assessments before an interview has taken place. |
| 2026-11-25 | Replaced the ambiguous `ASSESSMENT_NOT_ALLOWED` error with `INTERVIEW_NOT_COMPLETED`. | Make the assessment eligibility rule explicit and consistent. |
| 2026-11-25 | Clarified that replacing an assessment retains its ID and updates `submittedAt`. | Define predictable idempotent `PUT` behavior. |
