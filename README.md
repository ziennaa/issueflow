# IssueFlow

A full-stack developer issue tracker with a dark navigation rail, a light dashboard, persistent projects and issues, and a three-column Kanban board.

## Run locally (Windows, macOS, Linux)

Use Node.js 24 LTS and npm. In the project folder:

```sh
npm install
npm run dev
```

Open **http://localhost:3000**. SQLite initializes automatically. No Docker, cloud database, API key, or paid service is required locally. Use `npm start` for standard startup. `npm run db:init` initializes explicitly.

The first visit opens a newly created, isolated demo account containing fictional projects. Use the avatar → Create your account for a blank personal workspace. Sign out to see login/register pages. Demo data is real database data and all CRUD actions persist; browser storage holds only the dismissed-tip preference. No shared demo password is published. To seed a registered local account: `npm run seed -- email@example.com` (adds fictional data; can be repeated intentionally).

## Technologies actually installed

- HTML5, CSS3, vanilla JavaScript ES modules, Fetch API and native DOM events
- Bootstrap 5.3.8; Bootstrap Icons 1.13.2
- Express 5.3.0; better-sqlite3 12.11.1; bcrypt 6.0.0; express-session 1.19.0
- Hosted adapter: Cloudflare Worker, D1 (SQLite), Sites-managed ChatGPT identity
- Build: esbuild 0.25.12; tests: built-in Node test runner

### Hosting distinction

Sites cannot execute an Express HTTP server or native better-sqlite3/bcrypt modules. The **local university project uses the requested Express/SQLite/bcrypt/express-session stack**. The published Site uses a bundled Worker adapter, D1 prepared SQL, Sites-managed ChatGPT identity, and D1-backed CSRF tokens. The hosted version no longer depends on application cookies passing through the hosting proxy. Both use `server/core.js` for validation, authorization, CRUD, filtering, and statistics; the same HTML/CSS/JS frontend runs on both. This distinction must be preserved in your report. No React, TypeScript, Tailwind, Prisma, or frontend mock API is used.

## Functionalities

Registration, login, logout, persistent sessions; account-isolated projects; create/edit/delete projects with cascade deletion and confirmation; create/edit/delete issues with priority, status and optional due date; dashboard statistics and priority distribution; project details; Kanban drag-and-drop and keyboard-accessible dropdown status updates; title/description search with debounce; combinable project, status, priority filters and reset; responsive navigation, modal forms, loading, error and empty states; toast notifications.

## Four modules (proposed demonstration allocation)

| Member | Module | Views |
|---|---|---|
| 1 | User Authentication | Login, Register, Account |
| 1 | Project and Issue Management | Projects, Project Details, All Issues |
| 2 | Kanban Board | Kanban Board |
| 2 | Search and Filtering | Issue Explorer |

Dashboard is shared. This is a suggested demonstration split, not a claim about either student's contribution. Confirm names and actual contributions with both members.

## Source structure

```text
public/index.html          Shared semantic HTML shell and dialog
public/css/styles.css      Responsive application design
public/js/api.js           Fetch API helper and CSRF token handling
public/js/app.js           View renderers, forms, board, filters, authentication
server/app.js              Express, persistent session store, static serving
server/db.js               SQLite initialization and prepared statement adapter
server/core.js             Shared REST API, validation, ownership, demo seed
worker/index.js            Hosted D1/session/asset adapter
scripts/build.mjs          Bundled Worker build and vendor assets
scripts/seed.js            Optional local demo data for a registered account
db/schema.sql             Reproducible schema
drizzle/                  Hosted schema migration
tests/                    Local API and hosted adapter integration tests
docs/                     API, architecture, team and report notes
.openai/hosting.json       Site identity and D1 binding
```

Application views use URL hashes (`#dashboard`, `#projects`, `#project/id`, `#issues`, `#kanban`, `#explorer`, `#login`, `#register`). Direct `.html` view routes are also recognized. This avoids duplicate shells while keeping four clearly named functional modules.

## Security and persistence

Passwords use bcrypt cost 12. Session cookies are HTTP-only, SameSite=Lax; production cookies are Secure. Local sessions are stored in SQLite. A randomly generated development session secret is kept in the ignored data folder so sessions survive restarts. For production set `SESSION_SECRET` to a stable, random secret and use HTTPS with `NODE_ENV=production`. Environment placeholders are in `.env.example`; set variables in your shell (the app does not auto-load .env).

State-changing authenticated requests require a session CSRF token, supplied by `/api/auth/me` or successful login/registration. Origin checks reject cross-origin writes. SQL uses bound parameters, ownership is derived from the session, and inaccessible records return 404. User text is HTML-escaped before inserting generated markup. Foreign keys cascade on project deletion.

## Checks

```sh
npm run build
npm test
npm run validate
```

`npm test` uses isolated temporary databases and tests local authentication/CRUD/filtering/authorization/CSRF/restart persistence, plus the bundled Worker adapter’s cookie-free Sites identity, isolated workspaces, CSRF protection, D1-style persistence and asset serving. Build before tests for the Worker suite.

Browser QA performed using the managed Chrome preview: loaded dashboard; created a real issue; changed To Do → In Progress; reloaded and changed to Done; combined text search, HIGH priority and DONE status to obtain the one matching issue. Full automated browser coverage, mobile device testing, native drag-and-drop, Lighthouse and WAVE have not been performed. No scores are claimed.

## Documentation and limitations

See `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/TEAM_CONTRIBUTIONS.md`, and `docs/REPORT_NOTES.md`. Screenshots must be captured from the actual running application; none are fabricated. This checkout is synced to the Site source repository, not to a user GitHub repository. GitHub publication requires your separate instruction. Password reset, invitations, attachments, real-time updates, email notifications, rate limiting and pagination are future scope. Do not represent the sample issue titles as implemented backend features. Large data sets are loaded without pagination. Automated demo/account expiry cleanup is not implemented.

### Hosted authentication correction

The published app uses the trusted `oai-authenticated-user-id` supplied by Sites dispatch for workspace ownership. The first authenticated visit creates a workspace with fictional starter records. Later visits reuse it without reseeding. Sign-out uses the platform sign-out route. Local registration/password login and express-session are unchanged. Frontend 401 responses clear stale state and lead to sign-in instead of a reload loop.
