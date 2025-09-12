# NS5 Replacement – SMS + Digital Logbook Platform

A modern, hybrid Safety Management System (SMS) and Digital Logbook to replace NS5. Focused on crew-first usability, rigorous compliance, offline-first shipboard operations, and clear fleet oversight.

## Current Status (Dev Preview)
- Edge DB (Postgres) with seeds for two demo tenants and vessels.
- Edge API (Go) with health, tenants, vessels-by-tenant, and auth/session endpoints.
- PWA Shell (React + Vite) with tenant selector, login, and role-aware home.
- Dev conveniences: Vite proxy (avoids CORS in dev), Makefile targets, Adminer UI, HTML root page for API.

## Repository Layout
- `apps/edge/`
  - `docker-compose.yml`: Postgres + Adminer + API
  - `.env` / `.env.example`: DB + API env
  - `db/migrations/`: SQL DDL (initial schema)
  - `db/init/`: Container init scripts (schema + seeds)
  - `db/seeds/`: Seed scripts
  - `api/`: Go API service (handlers, middleware, config)
  - `Makefile`: helper targets
  - `scripts/`: utility scripts (e.g., seeding)
- `apps/web/`
  - React + Vite PWA, design tokens, auth state, login UI
- `.cody/project/plan/`: Discovery/PRD/Plan documents

## Quick Start
Prereqs: Docker + Compose, Node 20+, Go 1.22+, Make

1) One command (recommended)
- From the repo root: `make dev`
- This rebuilds the API and starts the backend (Docker), then starts the web dev server in this terminal.
- It also tries to open these in your browser automatically (macOS/Linux):
  - Web http://localhost:5173
  - API http://localhost:8081
  - Docs http://localhost:8081/docs
  - Adminer http://localhost:8080

2) Start Edge Stack only
- `cd apps/edge && cp .env.example .env && docker compose up -d`
- Adminer: http://localhost:8080 (Server: `db`, DB: `sms_edge`, User: `sms`)
- API: http://localhost:8081 (HTML landing page at `/`)
- Optional: add a 2nd tenant: `make -C apps/edge seed-oceanic`

3) Start PWA only
- `cd apps/web && cp .env.example .env && npm install && npm run dev`
- PWA: http://localhost:5173 (Vite proxy maps `/api/*` → API)

3) Sign In
- Use the tenant selector (Demo Shipping or Oceanic Logistics)
- Username `admin`, PIN `1234` (or click Dev Quickstart in the UI)

## API Overview (Edge)
Base URL: `http://localhost:8081`

- Health
  - `GET /healthz` → `{ ok: true, time }`
- Tenants
  - `GET /tenants` → `[ { id, name, region, createdAt }, ... ]`
  - `GET /tenants/{id}` → `{ id, name, region, createdAt }`
- Vessels
  - `GET /vessels?tenantId={uuid}` → `[ { id, tenantId, name, ... }, ... ]`
- Auth & Sessions
  - `POST /auth/set-pin` { tenantId, username, pin }
  - `POST /auth/login` { tenantId, username|email, pin } → `{ token, user{ id, tenantId, roles... } }`
  - `GET /me` (Bearer token) → user profile + roles
  - `POST /auth/logout` (Bearer token) → `{ ok: true }`
- Dev-only (when `DEV_MODE=true`)
  - `POST /demo/quickstart` → `{ tenantId, token, username, pin }`

Notes:
- JSON field names are standardized to lowercase (e.g., `id`, `name`, `region`).
- In dev, CORS is permissive; the PWA proxies requests via `/api` to avoid CORS entirely.

## Seeds and Demo Users
Tenants
- Demo Shipping (eu-central-1)
- Oceanic Logistics (us-east-1)

Users per tenant (created without PINs by default)
- `admin`, `author`, `reviewer`, `auditor`
- Set PIN via `POST /auth/set-pin` or use Dev Quickstart.

Sample Vessels
- Demo Shipping: `MV Pioneer` (US, ABS)
- Oceanic Logistics: `MV Horizon` (UK, DNV)

## PWA Shell (React + Vite)
- Tenant selection with auto-load and robust fallbacks.
- Login form wired to `/auth/login` and `/me`.
- Role-aware Home shows roles and basic links.
- Design tokens + minimal dark theme for quick iteration.

Dev Proxy
- `apps/web/vite.config.ts` proxies `/api/*` → `http://localhost:8081`
- Default `VITE_API_BASE` is `/api` in `.env.example` (no CORS needed).

## Developer Workflow
Edge
- Build/Run API: `cd apps/edge && docker compose build api && docker compose up -d`
- Logs: `make -C apps/edge api-logs` / `db-logs`
- Seed extra tenant: `make -C apps/edge seed-oceanic`

Web
- Run: `cd apps/web && npm run dev`
- Env: `VITE_API_BASE=/api` (default) or direct URL if not using proxy.

Scripts
- `apps/edge/scripts/test-auth.sh`: quick token + /me test

## API Docs with Swagger UI
Swagger UI gives you a clickable, self‑documenting view of the API and lets you test requests in your browser.

- Open the docs: http://localhost:8081/docs
- Open the raw specs:
  - JSON: http://localhost:8081/openapi.json
  - YAML: http://localhost:8081/openapi.yaml

How to use it
1) Browse endpoints in the left panel (e.g., `/tenants`, `/vessels`, `/auth/login`).
2) Click an endpoint → see description, parameters, and response schemas.
3) Click “Try it out” to run a request from your browser.
4) Enter parameters (e.g., `tenantId` as a UUID for `/vessels`).
5) Click “Execute” → inspect the Response section:
   - Status code (200/401/403…)
   - Response body (JSON)
   - Example `curl` command you can copy to a terminal

Authorizing requests (Bearer token)
- Some routes require auth (`/me`, `/auth/logout`, `/admin/ping`).
- Get a token first:
  - Option A (UI): in the web app, log in and use DevTools → Application → Local Storage to read `token`.
  - Option B (API): in Swagger, call `/auth/login` (tenantId + username + pin) and copy the `token` from the response.
- In Swagger UI, click “Authorize” (lock icon) → paste `Bearer YOUR_TOKEN` or just `YOUR_TOKEN` (Swagger will handle the prefix) → Authorize.
- Protected routes will now include the Authorization header when you “Try it out”.

Analyzing responses
- Use the returned status code to understand the outcome:
  - 200: Success; check the JSON body for data.
  - 401: Not logged in / invalid token; click “Authorize” or refresh the token.
  - 403: Logged in but missing required role (e.g., `/admin/ping` needs `admin`).
  - 429: Rate limit hit (auth endpoints); wait a minute or slow down retries.
- Compare the “Response body” to the schema shown in Swagger to verify shape and fields.
- Copy the generated `curl` to script repeatable tests in your terminal or CI.

Schemas (bottom of the page)
- Open the `components/schemas` section to see data shapes (Tenant, Vessel, User, LoginRequest/Response).
- Each schema lists field names, types, nullability, and formats (e.g., `uuid`, `date-time`).

Common tasks in Swagger
- List companies: `GET /tenants`
- List vessels: `GET /vessels?tenantId=...`
- Login: `POST /auth/login` → capture `token`
- Me: `GET /me` (with `Authorize`)
- Admin ping: `GET /admin/ping` (requires `admin` role)

Troubleshooting Swagger
- If docs don’t load: rebuild API (`docker compose build api && docker compose up -d`), then open `/openapi.json` directly.
- 401/403 on protected routes: ensure you clicked “Authorize” and the token is current; confirm your user has the right role.
- CORS errors (rare in Swagger): open Swagger UI directly from the API origin (`http://localhost:8081/docs`), not from the web dev server.

## Security & Compliance Foundations
- Sessions with expiry/optional revocation; bearer tokens for API.
- Roles associated with users; `/me` returns roles for gating UI/routes.
- Audit event table scaffold; hash-links table ready for future sealing.
- Dev defaults are relaxed (CORS `*`, quickstart endpoint). Tighten for prod.

## Roadmap (Next Steps)
- RBAC Guards: middleware (RequireRoles) + protect admin routes; emit audit events on login/logout/access.
- Design System & A11y: expand tokens, focus states, keyboard nav, WCAG pass.
- OpenAPI + Tests: generate spec, add handler tests, VS Code REST samples.
- Offline/Sync Scaffold (v0.1.1): local-first change tracking, vector clocks, delta protocol stub.
- Logbooks (v0.1.2–0.1.3): Bridge/Engine, then GMDSS/ORB I/Garbage schemas + UI.
- Sealing/PDFs (v0.1.7): hash-chaining, daily sealing, sealed PDFs with QR/hash.

## Troubleshooting
- Tenants not loading in PWA: ensure web dev server restarted after proxy change; use hard refresh. Verify `GET /api/tenants` → 200 in Network tab.
- API build errors: `docker compose build api` and watch for module path/import issues.
- DB init errors: `docker compose down -v && docker compose up -d` to re-run init scripts.

---
Last updated: generated via `:cody refresh update`
