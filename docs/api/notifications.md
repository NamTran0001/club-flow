# Notifications API

## 1. Overview

In-app notifications for Applicants. A notification is created when an
Executive publishes a final result for an application. Applicants can read
and mark as read only their own notifications.

Base path: `/api`.

### Notification object

| Field | Type | Rules |
|---|---|---|
| `id` | string | Server-generated. |
| `type` | string | `RESULT_PUBLISHED`. |
| `title` | string | Short heading. |
| `message` | string | Human-readable body. |
| `applicationId` | string | The related application. |
| `createdAt` | string | ISO 8601 timestamp with timezone offset. |
| `read` | boolean | `false` until the Applicant marks it as read. |

### Notification creation rules

1. A notification is created when an Executive successfully publishes the
   final result for an application.
2. No notification is created when an application is submitted, screened,
   assessed or assigned a draft result.
3. Each published application result creates at most one notification.
   Retrying the publish operation must not create duplicate notifications.
4. The notification belongs to the Applicant who owns the related
   application.
5. The notification is created with `read: false`.
6. Publishing a result and creating its notification must be treated as one
   logical operation. A successful publication must not leave the Applicant
   without the corresponding notification.

The Results API is responsible for triggering notification creation.
The Notifications API only provides operations for Applicants to retrieve
and update their notifications.

## 2. List my notifications

**Endpoint:** `GET /api/notifications`  
**Access:** Applicant only

Returns notifications belonging to the authenticated Applicant, ordered
by `createdAt` descending (newest first).

The endpoint must never return notifications belonging to another
Applicant.

### Example

```http
GET /api/notifications
Authorization: Bearer {{token:studentA}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": [
    {
      "id": "notification_001",
      "type": "RESULT_PUBLISHED",
      "title": "Kết quả tuyển thành viên",
      "message": "Đơn A01 của bạn đã có kết quả: PASS.",
      "applicationId": "application_001",
      "createdAt": "2026-11-06T10:00:00+07:00",
      "read": false
    }
  ]
}
```

### Example — no notifications

```http
GET /api/notifications
Authorization: Bearer {{token:studentB}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": []
}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The caller is not an Applicant. |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected failure. |

## 3. Mark a notification as read

**Endpoint:** `PATCH /api/notifications/{notificationId}`  
**Access:** Applicant — own notifications only  
**Content-Type:** `application/json`

Marks a notification as read. Applicants cannot update notifications
belonging to other Applicants.

### Request body

| Field | Type | Required | Rules |
|---|---|---:|---|
| `read` | boolean | Yes | Must be `true`. |

This endpoint only supports marking a notification as read. It does not
support changing a notification back to unread.

### Example

```http
PATCH /api/notifications/notification_001
Authorization: Bearer {{token:studentA}}
Content-Type: application/json

{
  "read": true
}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Notification updated",
  "data": {
    "id": "notification_001",
    "type": "RESULT_PUBLISHED",
    "title": "Kết quả tuyển thành viên",
    "message": "Đơn A01 của bạn đã có kết quả: PASS.",
    "applicationId": "application_001",
    "createdAt": "2026-11-06T10:00:00+07:00",
    "read": true
  }
}
```

Calling this endpoint again for an already-read notification is successful
and returns the notification with `read: true`.

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `read` is missing, is not a boolean, or is `false`. |
| `401` | `UNAUTHORIZED` | No valid token. |
| `403` | `FORBIDDEN` | The notification belongs to another Applicant. |
| `404` | `NOTIFICATION_NOT_FOUND` | No notification has that ID. |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected failure. |

## 4. Authorization rules

1. Only authenticated Applicants can access the Notifications API.
2. Applicants can list only their own notifications.
3. Applicants can mark as read only notifications belonging to them.
4. Notification ownership is determined through the related application.
5. The backend must enforce ownership checks. Hiding notification controls
   in the frontend does not replace backend authorization.

## 5. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Added the Applicant notification list and read marker. | Cover the in-app notification in C10/C11. |
| 2026-11-25 | Defined notification creation, ownership, ordering, duplicate prevention and read-only update behavior; aligned the example with `application_001` and `A01`. | Keep notification behavior consistent with application and result publication workflows. |
