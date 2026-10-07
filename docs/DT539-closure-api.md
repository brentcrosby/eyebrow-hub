# DT539 Booking Closure API

## Endpoint

`PATCH /api/admin/appointments/{id}/status`

This endpoint uses the existing `Appointment` model. It closes a confirmed
appointment by changing its status to `cancelled`.

## Authentication and authorization

The request must include the authenticated admin session cookie
`adminAccessToken`. The user must also be listed in the server-side
`ADMIN_USER_IDS` setting.

- Missing or invalid session: `401 Unauthorized`
- Authenticated user without admin permission: `403 Forbidden`

Authentication and authorization are checked before the appointment is read or
updated.

## Request

```http
PATCH /api/admin/appointments/7/status
Content-Type: application/json
Cookie: adminAccessToken=<admin-session-token>
```

```json
{
  "status": "cancelled"
}
```

Only a confirmed appointment can transition to `cancelled`.

## Successful response

Status: `200 OK`

```json
{
  "success": true,
  "appointment": {
    "id": 7,
    "status": "cancelled"
  }
}
```

The appointment object contains the updated appointment and its service and
stylist relations.

## Error responses

- `400 Bad Request`: missing or unsupported status value.
- `401 Unauthorized`: no valid admin session.
- `403 Forbidden`: user is not an approved admin.
- `404 Not Found`: invalid appointment ID or appointment does not exist.
- `409 Conflict`: appointment is not eligible for this transition, is already
  cancelled, or its status changed during the request.
- `500 Internal Server Error`: the status update could not be completed.

Error responses contain a general error message and do not include sensitive
session information.