# Authentication API

## 1. Overview

Sign-in and identity endpoints for ClubFlow. Accounts are pre-created; there
is no self-service registration, recovery or university SSO.

Base path: `/api`. Protected requests send `Authorization: Bearer <token>`.

| Role | Code |
|---|---|
| Executive | `EXECUTIVE` |
| Applicant | `APPLICANT` |
| Interviewer | `INTERVIEWER` |

## 2. Sign in

**Endpoint:** `POST /api/auth/login`  
**Access:** Public  
**Content-Type:** `application/json`

| Field | Type | Required | Rules |
|---|---|---:|---|
| `email` | string | Yes | A pre-created account e-mail. |
| `password` | string | Yes | The account password. |

### Example — successful sign-in

```http
POST /api/auth/login
Content-Type: application/json

{"email": "exec@clubflow.test", "password": "exec-demo"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Login successful", "data": {"accessToken": "…", "user": {"id": "u-exec", "fullName": "Nguyễn Thu Hà", "email": "exec@clubflow.test", "role": "EXECUTIVE"}}}
```

### Example — wrong password

```http
POST /api/auth/login
Content-Type: application/json

{"email": "exec@clubflow.test", "password": "wrong-password"}
```

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"success": false, "message": "Invalid email or password", "error": {"code": "INVALID_CREDENTIALS"}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | `email` or `password` is missing or not a string. |
| `401` | `INVALID_CREDENTIALS` | The e-mail/password pair is not a pre-created account. |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected failure. |

## 3. Get the current user

**Endpoint:** `GET /api/auth/me`  
**Access:** Any authenticated user

### Example — applicant

```http
GET /api/auth/me
Authorization: Bearer {{token:studentA}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "data": {"id": "u-studentA", "fullName": "Nguyễn Minh Anh", "email": "studenta@clubflow.test", "role": "APPLICANT", "studentId": "24120101"}}
```

### Example — missing token

```http
GET /api/auth/me
```

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"success": false, "message": "Authentication is required", "error": {"code": "UNAUTHORIZED"}}
```

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | The token is missing, unknown or malformed. |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected failure. |

## 4. Sign out

**Endpoint:** `POST /api/auth/logout`  
**Access:** Any authenticated user

### Example

```http
POST /api/auth/logout
Authorization: Bearer {{token:exec}}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "message": "Logout successful"}
```

The client removes its stored token. The mock uses stateless tokens, so logout
invalidates the client session only; the same token still identifies the user
until the mock restarts.

### Errors

| Status | Code | When |
|---:|---|---|
| `401` | `UNAUTHORIZED` | The token is missing or unknown. |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected failure. |

## 5. Authorization rules

| Action | Visitor | Applicant | Interviewer | Executive |
|---|---:|---:|---:|---:|
| Sign in | Yes | Yes | Yes | Yes |
| Read own profile | No | Yes | Yes | Yes |
| Submit an application | No | Yes | No | No |
| Read own applications | No | Yes | No | No |
| Review all applications | No | No | No | Yes |
| Read assigned interviews | No | No | Yes | Yes |
| Submit an assigned assessment | No | No | Yes | No |
| Manage campaigns and final results | No | No | No | Yes |

An applicant can only read their own applications and results. An interviewer
can only read applications attached to an interview assigned to them. Hiding a
front-end control does not replace any of these backend checks.

## 6. Changes

| Date | Change | Why |
|---|---|---|
| 2026-11-25 | Added executable examples and the shared error shape; aligned login answer with the mock's `accessToken` field. | Make the contract testable by `contract-check.mjs`. |
