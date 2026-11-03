# University report support

## 1. Project overview

IssueFlow is a web application for organizing software projects and tracking development work. Developers can create personal projects, record issues, set priorities and deadlines, and move tasks through a Kanban board. A dashboard summarizes real stored data. Search and combined filters help focus on relevant work. The application demonstrates HTTP, REST, session authentication, relational data and dynamic DOM updates.

Target users: student developers, individual contributors and software project teams. Current accounts have isolated personal workspaces; team collaboration is future scope.

Sitemap: Login/Register → Overview → Projects → Project Details; All Issues; Kanban Board; Issue Explorer. Avatar opens account/sign-out actions.

### Tools and technologies

| Item | Details |
|---|---|
| HTML | HTML5, semantic shell, real forms and dialog |
| CSS | Bootstrap 5.3.8 + custom CSS; Bootstrap Icons 1.13.2 |
| JavaScript | ES modules, Fetch API, DOM events, async/await, debounce |
| Local backend | Node.js, Express 5.3.0, better-sqlite3 12.11.1 |
| Local auth | bcrypt 6.0.0; express-session 1.19.0 with SQLite Store |
| Hosted backend | Worker + D1 + Sites-managed ChatGPT identity |
| Tools | npm, Node test runner, esbuild 0.25.12, managed Chrome browser QA |
| Accessibility | Semantic HTML, associated labels, keyboard forms/status dropdowns, focus indicators, native dialog, live toasts; no full WCAG audit |

Describe the local stack for the mandated academic submission. Explicitly distinguish the hosted adapter. VS Code is supported; it was not used as a verification tool in this build. Lighthouse and WAVE were not run. Do not claim their scores.

Common design: dark sidebar, light content, purple accent, restrained borders, shared forms/modals/buttons, status text and icons, responsive layouts. User input is escaped before generated markup is inserted.

## 2. Member 1

### User Authentication

Purpose: establish and retain an authenticated identity. Inputs: name/email/password. Processing: validate, reject duplicate email, bcrypt hash, create a DB user, rotate session and return public user fields/CSRF token. Output: dashboard or friendly error. UI: Login/Register forms and account dialog. Communication: POST /api/auth/register, POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout. The browser submits JSON and stores no password. Cookies are HTTP-only. Local session Store reads/writes SQLite rows.

Code references: `server/core.js` auth branches; `server/app.js` Store/session configuration; `public/js/app.js` authView/wireAuth; `public/js/api.js`.

### Project and Issue Management

Purpose: structure work into owned projects and actionable issues. Inputs: project name/description/color; issue title/description/project/priority/status/date. Processing: validate, derive owner from session, bind SQL parameters, persist changes. Output: project cards, updated issue lists, statistics, toast. UI: project grid, project details, all issues, shared form dialog, explicit deletion confirmation. Communication: project and issue GET/POST/PUT/DELETE endpoints. Project delete cascades issues. HTML required/max length constraints supplement server validation.

Code references: core `project`, `issue`, `values` functions; app `editProject`, `editIssue`, `confirmDelete`. Example frontend communication: `api('/issues', {method:'POST', body})` sends JSON and CSRF, then refreshes real data.

## 3. Member 2

### Kanban Board

Purpose: visualize and update workflow. Inputs: drag target or accessible status dropdown, plus filters. Processing: fetch owned issues, group by TODO/IN_PROGRESS/DONE, PATCH status on successful interaction, refresh data. Outputs: cards in the correct column, live counts, success/failure toast. UI: three columns; issue title/description/priority/project/date; dropdown on every card. Communication: GET /api/issues and PATCH /api/issues/:id/status with `{status:'IN_PROGRESS'}`. Backend validates status and ownership before SQL UPDATE. Code: app `board`, `wireBoard`, `changeStatus`; core status route. Dropdown workflow was browser-verified; native drag-and-drop implementation has not been exercised in browser QA.

### Search and Filtering

Purpose: retrieve relevant issues. Inputs: title/description text, priority, status, project. Processing: debounce search 280ms, construct query parameters, join issue/project SQL with owner constraint and bound filters. Outputs: matching rows/count or empty state. Clear resets all filters. Code: app `filters`, `applyFilters`, `wireFilters`; core GET issues branch. Browser testing combined text + HIGH priority + DONE status to show exactly one created issue.

## 4. Verification and conclusion

Automated tests use isolated SQLite databases. Verified registration, duplicate/invalid registration, login rejection/success, sessions, CSRF rejection, project and issue CRUD, priority/status changes, combined filters and description search, ownership isolation, dashboard counts, cascading delete and persistence after server restart. Hosted adapter tests verify assets, cookie-free Sites identity, isolated persistent workspaces, CSRF checks and status persistence through a D1-compatible local adapter. These tests do not substitute for a full production D1 browser test.

Browser checks: dashboard load, issue creation, To Do→In Progress→Done, reload, combined explorer filters. Unverified: exhaustive UI paths, mobile device layout, native drag/drop, Lighthouse/WAVE, concurrency/load and production security audit.

Conclusion: the application integrates core web technologies with a persistent relational backend and four demonstrable modules. It demonstrates prepared SQL, cookie sessions, validation, REST communication and DOM-driven interfaces. Future scope: collaboration, invitations, password recovery, email notifications, uploads, pagination, rate limiting and advanced analytics. These are not implemented features.

## Screenshot checklist (capture actual running views)

1. Register form; validation error; Login form.
2. Dashboard with real statistics and project progress.
3. Projects grid; create/edit project dialog.
4. Project Details and associated issues.
5. Create/edit issue dialog showing priority, status and date.
6. Deletion confirmation (before confirming).
7. Kanban board with all three columns.
8. Issue moved to In Progress and state after refresh.
9. Explorer with combined filters and matching count.
10. Explorer empty state and cleared filters.
11. Local terminal running app; passing npm tests.
12. Browser network panel showing JSON request/response (not yet captured).

Do not invent screenshots, student identities, signatures, faculty details or actual individual contributions.

## References

- MDN HTML: https://developer.mozilla.org/en-US/docs/Web/HTML
- MDN Fetch: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- Bootstrap: https://getbootstrap.com/docs/5.3/
- Node.js: https://nodejs.org/docs/latest-v24.x/api/
- Express: https://expressjs.com/
- SQLite: https://www.sqlite.org/docs.html
- express-session: https://github.com/expressjs/session
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3
- WCAG 2.2: https://www.w3.org/TR/WCAG22/

These are genuine reference URLs; do not imply a full accessibility certification.
