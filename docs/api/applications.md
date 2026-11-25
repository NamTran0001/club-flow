# Applications API

## 1. Overview

Application submission, personal tracking and Executive CV screening.

Base path: `/api`.

### Application statuses

| Status | Meaning |
|---|---|
| `PENDING` | Submitted and waiting for CV screening. |
| `SHORTLISTED` | Passed CV screening; eligible for interview scheduling. |
| `REJECTED` | Failed CV screening; never enters scheduling. |

Interview state and final results are separate resources. `SHORTLISTED` is not
an acceptance and does not mean an interview is already confirmed.

### Application rules

1. Only an authenticated Applicant may submit.
2. One application per position per campaign. A student may apply for several
   different positions; each is a separate application.
3. A duplicate submission returns the existing application id instead of
   creating another record.
4. A CV must be a PDF of at most 5 MB.
5. A motivation statement is at most 300 words.
6. Applications are accepted only while the campaign is `OPEN` and the
   submission time is inside the campaign's application period.
7. Applicants read only their own applications. Executives read all
   applications in a campaign. An interviewer reads only an application
   attached to an interview assigned to them.
8. Internal screening notes are never included in an Applicant or Interviewer
   answer.

## 2. Submit an application

**Endpoint:** `POST /api/applications`  
**Access:** Applicant only  
**Content-Type:** `multipart/form-data`

| Field | Type | Required | Rules |
|---|---|---:|---|
| `campaignId` | string | Yes | Must exist and be `OPEN`. |
| `positionId` | string | Yes | Must belong to the campaign. |
| `studentId` | string | Yes | 4–20 characters. |
| `fullName` | string | Yes | 1–150 characters. |
| `email` | string | Yes | A valid e-mail address. |
| `phone` | string | Yes | 8–20 characters. |
| `cv` | file | Yes | PDF only, at most 5 MB. |
| `motivationStatement` | string | Yes | At most 300 words. |
| `availabilitySlotIds` | string | Yes | JSON array of slot ids from `GET /api/campaigns/{campaignId}/slots`. |

### Example — duplicate application

```sh
curl -i http://localhost:3001/api/applications \
  -H "Authorization: Bearer {{token:studentA}}" \
  -F campaignId=campaign_001 \
  -F positionId=position_001 \
  -F studentId=24120101 \
  -F "fullName=Nguyễn Minh Anh" \
  -F email=studenta@clubflow.test \
  -F phone=0901234567 \
  -F "cv=@{{file:cv.pdf:1MB}};type=application/pdf" \
  -F "motivationStatement=Em muốn tham gia câu lạc bộ." \
  -F 'availabilitySlotIds=["slot_001","slot_002"]'
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{"success": false, "message": "You have already applied for this position", "error": {"code": "APPLICATION_ALREADY_EXISTS", "existingApplicationId": "application_001"}}
```

### Example — successful submission for another position

```sh
curl -i http://localhost:3001/api/applications \
  -H "Authorization: Bearer {{token:studentA}}" \
  -F campaignId=campaign_001 \
  -F positionId=position_003 \
  -F studentId=24120101 \
  -F "fullName=Nguyễn Minh Anh" \
  -F email=studenta@clubflow.test \
  -F phone=0901234567 \
  -F "cv=@{{file:cv.pdf:1MB}};type=application/pdf" \
  -F "motivationStatement=Em muốn tham gia Ban Kỹ thuật." \
  -F 'availabilitySlotIds=["slot_001","slot_002"]'
```

```http
HTTP/1.1 201 Created
Content-Type: application/json

{"success": true, "message": "Application submitted successfully", "data": {"id": "application_009", "campaignId": "campaign_001", "positionId": "position_003", "applicantId": "u-studentA", "status": "PENDING", "submittedAt": "…"}}
```

### Example — not a PDF

```sh
curl -i http://localhost:3001/api/applications \
  -H "Authorization: Bearer {{token:studentA}}" \
  -F campaignId=campaign_001 \
  -F positionId=position_003 \
  -F studentId=24120101 \
  -F "fullName=Nguyễn Minh Anh" \
  -F email=studenta@clubflow.test \
  -F phone=0901234567 \
  -F "cv=@{{file:cv.txt:1KB}};type=text/plain" \
  -F "motivationStatement=Em muốn tham gia." \
  -F 'availabilitySlotIds=["slot_001"]'
```

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{"success": false, "message": "CV must be a PDF file", "error": {"code": "INVALID_CV_FORMAT"}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | A field is missing or outside its limit; `details` names each field. |
| `400` | `INVALID_CV_FORMAT` | The uploaded file is not a PDF. |
| `400` | `CV_TOO_LARGE` | The PDF is larger than 5 MB. |
| `400` | `MOTIVATION_TOO_LONG` | The statement is longer than 300 words. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Applicant. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |
| `404` | `POSITION_NOT_FOUND` | The position does not belong to the campaign. |
| `409` | `CAMPAIGN_CLOSED` | The campaign is not open or the application period is over. |
| `409` | `APPLICATION_ALREADY_EXISTS` | The same applicant already has an application for this position in this campaign. |

### Example — closed campaign

```sh
curl -i http://localhost:3001/api/applications \
  -H "Authorization: Bearer {{token:studentA}}" \
  -F campaignId=campaign_002 \
  -F positionId=position_101 \
  -F studentId=24120101 \
  -F "fullName=Nguyễn Minh Anh" \
  -F email=studenta@clubflow.test \
  -F phone=0901234567 \
  -F "cv=@{{file:cv.pdf:1MB}};type=application/pdf" \
  -F "motivationStatement=Em muốn tham gia." \
  -F 'availabilitySlotIds=["slot_101"]'
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{"success": false, "message": "The campaign is not accepting applications", "error": {"code": "CAMPAIGN_CLOSED"}}
```

## 3. Get my applications

**Endpoint:** `GET /api/applications/me`  
**Access:** Applicant only

| Query | Type | Required | Rules |
|---|---|---:|---|
| `status` | string | No | `PENDING`, `SHORTLISTED` or `REJECTED`. |
| `page` | integer | No | 1 or more; default 1. |
| `limit` | integer | No | 1–100; default 10. |

The server identifies the applicant from the token and never accepts an
`applicantId` from the client.

### Example

```http
GET /api/applications/me?status=PENDING&page=1&limit=10
Authorization: Bearer {{token:studentA}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": [{"id": "application_009", "campaignId": "campaign_001", "campaignName": "Tuyển thành viên CLB Công nghệ thông tin 2026", "positionId": "position_003", "positionName": "Technical Member", "studentId": "24120101", "fullName": "Nguyễn Minh Anh", "email": "studenta@clubflow.test", "status": "PENDING", "submittedAt": "…"}], "pagination": {"page": 1, "limit": 10, "totalItems": 1, "totalPages": 1}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | An invalid status or pagination value. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Applicant. |

## 4. Get one application

**Endpoint:** `GET /api/applications/{applicationId}`  
**Access:** Applicant own · Executive · Interviewer assigned

The Applicant answer omits `internalNotes`. The Executive answer includes it.
The Interviewer answer omits it too.

### Example — applicant's own application

```http
GET /api/applications/application_001
Authorization: Bearer {{token:studentA}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": {"id": "application_001", "campaignId": "campaign_001", "campaignName": "Tuyển thành viên CLB Công nghệ thông tin 2026", "positionId": "position_001", "positionName": "Content Creator", "studentId": "24120101", "fullName": "Nguyễn Minh Anh", "email": "studenta@clubflow.test", "phone": "0901234567", "cvUrl": "/api/applications/application_001/cv", "cvFileName": "A01-NguyenMinhAnh-CV.pdf", "cvSizeBytes": 1468006, "motivationStatement": "Em đã có kinh nghiệm quản lý fanpage học thuật và mong muốn tham gia Ban Nội dung.", "status": "SHORTLISTED", "submittedAt": "2026-10-18T09:15:00+07:00"}}
```

### Example — Executive view with the internal note

```http
GET /api/applications/application_001
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": {"id": "application_001", "campaignId": "campaign_001", "campaignName": "Tuyển thành viên CLB Công nghệ thông tin 2026", "positionId": "position_001", "positionName": "Content Creator", "studentId": "24120101", "fullName": "Nguyễn Minh Anh", "email": "studenta@clubflow.test", "phone": "0901234567", "cvUrl": "/api/applications/application_001/cv", "cvFileName": "A01-NguyenMinhAnh-CV.pdf", "cvSizeBytes": 1468006, "motivationStatement": "Em đã có kinh nghiệm quản lý fanpage học thuật và mong muốn tham gia Ban Nội dung.", "status": "SHORTLISTED", "submittedAt": "2026-10-18T09:15:00+07:00", "internalNotes": "Portfolio tốt, phù hợp định hướng nội dung."}}
```

### Example — another applicant's application

```http
GET /api/applications/application_003
Authorization: Bearer {{token:studentA}}
```

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{"success": false, "message": "You cannot access this application", "error": {"code": "FORBIDDEN"}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The application belongs to another applicant, or the interviewer is not assigned to it. |
| `404` | `APPLICATION_NOT_FOUND` | No application has that id. |

## 5. List applications for review

**Endpoint:** `GET /api/applications`  
**Access:** Executive only

| Query | Type | Required | Rules |
|---|---|---:|---|
| `campaignId` | string | No | Filter by campaign. |
| `positionId` | string | No | Filter by position. |
| `status` | string | No | `PENDING`, `SHORTLISTED` or `REJECTED`. |
| `search` | string | No | Match name, e-mail or student id. |
| `sortBy` | string | No | `submittedAt`, `fullName` or `status`. |
| `order` | string | No | `asc` or `desc`; default `desc`. |
| `page` | integer | No | 1 or more; default 1. |
| `limit` | integer | No | 1–100; default 10. |

### Example

```http
GET /api/applications?campaignId=campaign_001&status=SHORTLISTED&sortBy=submittedAt&order=asc&page=1&limit=10
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": [{"id": "application_001", "applicantId": "u-studentA", "studentId": "24120101", "fullName": "Nguyễn Minh Anh", "email": "studenta@clubflow.test", "positionId": "position_001", "positionName": "Content Creator", "status": "SHORTLISTED", "submittedAt": "2026-10-18T09:15:00+07:00"}], "pagination": {"page": 1, "limit": 10, "totalItems": 5, "totalPages": 1}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | An invalid filter or pagination value. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |

## 6. Update screening status

**Endpoint:** `PATCH /api/applications/{applicationId}/screening`  
**Access:** Executive only  
**Content-Type:** `application/json`

| Field | Type | Required | Rules |
|---|---|---:|---|
| `status` | string | Yes | `SHORTLISTED` or `REJECTED`. |
| `internalNotes` | string | No | 0–2000 characters; Executive-only. |

### Example

```http
PATCH /api/applications/application_006/screening
Authorization: Bearer {{token:exec}}
Content-Type: application/json

{"status": "SHORTLISTED", "internalNotes": "Kinh nghiệm viết bài tốt; chuyển sang phỏng vấn."}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Application screening updated successfully", "data": {"id": "application_006", "status": "SHORTLISTED", "internalNotes": "Kinh nghiệm viết bài tốt; chuyển sang phỏng vấn.", "reviewedAt": "…"}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `status` is not `SHORTLISTED` or `REJECTED`, or a field is invalid. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `APPLICATION_NOT_FOUND` | No application has that id. |
| `409` | `APPLICATION_LOCKED` | The campaign is confirmed and applications are read-only. |

## 7. Application statistics

**Endpoint:** `GET /api/applications/statistics`  
**Access:** Executive only

| Query | Type | Required | Rules |
|---|---|---:|---|
| `campaignId` | string | Yes | The campaign to count. |

### Example

```http
GET /api/applications/statistics?campaignId=campaign_001
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": {"campaignId": "campaign_001", "totalApplications": 9, "pending": 2, "shortlisted": 6, "rejected": 1}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `campaignId` is missing. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |

## 8. Export applications

**Endpoint:** `GET /api/applications/export`  
**Access:** Executive only

| Query | Type | Required | Rules |
|---|---|---:|---|
| `campaignId` | string | Yes | The campaign to export. |
| `status` | string | No | Optional status filter. |

The answer is a CSV attachment. Internal notes are not included.

### Example

```http
GET /api/applications/export?campaignId=campaign_001
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: text/csv
Content-Disposition: attachment; filename="applications.csv"
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `campaignId` is missing. |
| `403` | `FORBIDDEN` | The caller is not an Executive. |
| `404` | `CAMPAIGN_NOT_FOUND` | The campaign does not exist. |

## 9. Download a CV

**Endpoint:** `GET /api/applications/{applicationId}/cv`  
**Access:** Applicant own · Executive · Interviewer assigned

### Example

```http
GET /api/applications/application_001/cv
Authorization: Bearer {{token:studentA}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: inline; filename="A01-NguyenMinhAnh-CV.pdf"
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller may not read this application. |
| `404` | `APPLICATION_NOT_FOUND` | No application has that id. |
| `404` | `CV_NOT_FOUND` | The application has no uploaded CV. |

## 10. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Added executable examples, field limits, the applicant/Executive field split, and the `cvSizeBytes` / `cvFileName` fields. | Make every screening and tracking endpoint testable and keep internal notes out of Applicant answers. |
