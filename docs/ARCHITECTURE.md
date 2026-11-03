# Architecture

The browser renders a semantic HTML shell, custom CSS plus Bootstrap, and vanilla JavaScript modules. `api.js` wraps Fetch with same-origin cookies, JSON serialization, consistent errors and CSRF tokens. `app.js` renders dashboard/projects/issues/board/explorer/auth views, binds forms and native drag/drop, and debounces search for 280ms.

Local: browser → Express → express-session with SQLite Store → shared API core → prepared statements in better-sqlite3 → disk database.

Hosted: browser → Sites-managed ChatGPT sign-in → Worker trusted identity header → D1-owned workspace and CSRF record → same API core → prepared statements in D1. Assets and vendor CSS/fonts are embedded into the Worker bundle by esbuild.

Every project query is constrained by the session user ID. Issue queries join projects and check project ownership before access. An issue update also checks ownership of a destination project. DELETE project cascades through the schema. Dashboard counts are computed from owned records, never frontend constants. Fictional data is inserted only by explicit seed/demo flows, then behaves like ordinary mutable records.

## Schema

- users: id, name, unique email, password_hash, is_demo, created_at.
- projects: id, name, description, owner_id → users, color, created_at, updated_at.
- issues: id, project_id → projects, title, description, priority, status, due_date, created_at, updated_at.
- sessions: hosted session id, user_id, csrf, expiry.
- local_sessions: express-session sid, JSON session, expiry.

Foreign keys are enforced and cascade. Indexes cover owner, issue project, status/priority and session expiry. `db/schema.sql` is the local schema; `drizzle/0000_issueflow.sql` is the hosted schema migration. Request handling never creates schema tables.

## Sessions and validation

Local bcrypt uses cost 12. Hosted authentication is managed by Sites; its trusted site-scoped user ID selects the workspace without relying on an application session cookie. On login/register the old session is replaced. Cookies use HttpOnly, SameSite=Lax, and Secure under production HTTPS. CSRF tokens protect authenticated mutations, plus Origin checking. Login and registration are server-validated, but production hardening such as rate limiting and recovery remains future scope. Demo sessions have random credentials, no published weak password, and unique per-session records. The first root visit creates a demo to make the demonstration immediately usable.
