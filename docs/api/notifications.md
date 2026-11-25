# Notifications API

## 1. Overview

In-app notifications for applicants. A notification is created when an
Executive publishes a final result. Applicants read only their own
notifications.

Base path: `/api`.

### Notification object

| Field | Type | Rules |
|---|---|---|
| `id` | string | Server-generated. |
| `type` | string | `RESULT_PUBLISHED`. |
| `title` | string | Short heading. |
| `message` | string | Human-readable body. |
| `applicationId` | string | The related application. |
| `createdAt` | string | ISO 8601. |
| `read` | boolean | `false` until the applicant marks it read. |

## 2. List my notifications

**Endpoint:** `GET /api/notifications`  
**Access:** Applicant only

### Example

```http
GET /api/notifications
Authorization: Bearer {{token:studentB}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": [{"id": "notification_101", "type": "RESULT_PUBLISHED", "title": "Kết quả tuyển thành viên", "message": "Đơn A101 của bạn đã có kết quả: PASS.", "applicationId": "application_101", "createdAt": "2025-11-06T10:00:00+07:00", "read": false}]}
```

### Example — no notifications

```http
GET /api/notifications
Authorization: Bearer {{token:studentA}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": []}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Applicant. |

## 3. Mark a notification as read

**Endpoint:** `PATCH /api/notifications/{notificationId}`  
**Access:** Applicant own

| Field | Type | Required | Rules |
|---|---|---:|---|
| `read` | boolean | Yes | `true` marks it read. |

### Example

```http
PATCH /api/notifications/notification_101
Authorization: Bearer {{token:studentB}}
Content-Type: application/json

{"read": true}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Notification updated", "data": {"id": "notification_101", "type": "RESULT_PUBLISHED", "title": "Kết quả tuyển thành viên", "message": "Đơn A101 của bạn đã có kết quả: PASS.", "applicationId": "application_101", "createdAt": "2025-11-06T10:00:00+07:00", "read": true}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `read` is missing or not a boolean. |
| `403` | `FORBIDDEN` | The notification belongs to another applicant. |
| `404` | `NOTIFICATION_NOT_FOUND` | No notification has that id. |

## 4. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Added the applicant notification list and read marker. | Cover the in-app notification in C10/C11. |
