# REST API

All routes use the same origin, JSON, and cookie sessions. `Content-Type: application/json` is used for writes. Authenticated writes must include `X-CSRF-Token`, returned by auth/me and successful sign-in. Success responses return a resource, array, stats object, or `{ "ok": true }`; failures return `{ "error": "Helpful message" }`.

| Method | Endpoint | Behavior |
|---|---|---|
| POST | /api/auth/register | `{name,email,password}`; password 8–72 characters; duplicate email 409 |
| POST | /api/auth/login | `{email,password}`; invalid credentials 401 |
| POST | /api/auth/logout | Delete session |
| GET | /api/auth/me | Current user and CSRF token; 401 when signed out |
| POST | /api/auth/demo | Create a private fictional demo workspace; retain existing signed-in workspace |
| GET | /api/projects | Owned projects with issue_count and done_count |
| POST | /api/projects | Create `{name,description,color}`; 201 |
| GET | /api/projects/:id | Owned project |
| PUT | /api/projects/:id | Update `{name,description,color}` |
| DELETE | /api/projects/:id | Cascade delete project/issues |
| GET | /api/issues | Owned issues, joined project_name/color; filters below |
| POST | /api/issues | Create issue; 201 |
| GET | /api/issues/:id | Owned issue |
| PUT | /api/issues/:id | Edit issue fields |
| PATCH | /api/issues/:id/status | `{status}` |
| DELETE | /api/issues/:id | Delete issue |
| GET | /api/dashboard/stats | Real project/issue/status/priority counts |

Issue JSON example:

```json
{"project_id":"project-uuid","title":"Fix login validation","description":"Show a helpful error.","priority":"HIGH","status":"TODO","due_date":"2026-11-10"}
```

Valid priorities: LOW, MEDIUM, HIGH. Valid statuses: TODO, IN_PROGRESS, DONE. Optional due date can be empty/null; non-empty values must be valid ISO calendar dates. Project names are 1–100 characters, issue titles 1–200. Descriptions are limited to 3000/10000 characters respectively. Color must be a six-digit hex color (otherwise default/preserved). Foreign or missing resource IDs return 404, validation 400, CSRF/origin 403, unauthenticated 401, unexpected server errors 500. All IDs are opaque UUID strings and bound as SQL parameters.

Search example: `/api/issues?search=login&priority=HIGH&status=TODO&project=project-uuid`. Search uses a bound SQLite LIKE pattern across title and description; `%` and `_` keep LIKE wildcard meaning. All specified filters combine with AND. Empty filters are omitted. No pagination is currently implemented.
