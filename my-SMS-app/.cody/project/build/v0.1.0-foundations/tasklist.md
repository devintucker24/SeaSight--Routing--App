# Version Tasklist – v0.1.0-foundations
This document outlines all the tasks to work on to deliver this version, grouped by phases.

| Status |      |
|--------|------|
| 🔴 | Not Started |
| 🟡 | In Progress |
| 🟢 | Completed |

## Phase 1 – Foundations & Edge Stack

| ID   | Task                               | Description                                                              | Dependecies | Status           | Assigned To |
|------|------------------------------------|--------------------------------------------------------------------------|-------------|------------------|-------------|
| FND-1 | Repo + CI scaffold                 | Repos, code style, lint/format, CI pipeline stub                         | None        | 🔴 Not Started   | AGENT       |
| FND-2 | Docker Compose edge stack          | API, DB, Files, Worker, Sealing, Sync with healthchecks                  | FND-1       | 🟢 Completed     | AGENT       |
| FND-3 | Edge Postgres schema + seeds       | Init tables (users, roles, permissions, audit_events, tenants, vessels)  | FND-2       | 🟢 Completed     | AGENT       |

## Phase 2 – Identity & RBAC

| ID    | Task                              | Description                                                               | Dependecies | Status           | Assigned To |
|-------|-----------------------------------|---------------------------------------------------------------------------|-------------|------------------|-------------|
| AUTH-1 | Define roles/permissions          | Author/Reviewer/Admin/Auditor; permission matrix                          | FND-3       | 🟢 Completed     | AGENT       |
| AUTH-2 | Local auth (PIN)                  | PIN hashing, login/logout, session storage                                | AUTH-1      | 🟢 Completed     | AGENT       |
| AUTH-3 | SSO stubs (OIDC/SAML)             | Config placeholders for shore SSO                                         | AUTH-1      | 🔴 Not Started   | AGENT       |
| AUTH-4 | Audit events                      | Append-only audit trail for auth/session events                           | AUTH-2      | 🟢 Completed     | AGENT       |
| AUTH-5 | Role guards + admin route         | RequireRoles middleware; protect `/admin/ping`                            | AUTH-1      | 🟢 Completed     | AGENT       |
| AUTH-6 | CORS allowlist + rate limiting    | CORS allowlist for dev; IP rate limit on auth endpoints                   | FND-2       | 🟢 Completed     | AGENT       |

## Phase 3 – Design System & Navigation

| ID     | Task                              | Description                                                               | Dependecies | Status           | Assigned To |
|--------|-----------------------------------|---------------------------------------------------------------------------|-------------|------------------|-------------|
| UX-1   | Design tokens & base components   | Colors, typography, spacing; Button, Input, Select, Table, Modal, Toast   | FND-1       | 🟢 Completed     | AGENT       |
| UX-2   | Navigation shell + role home      | Routing, role-aware home, quick actions, keyboard shortcuts               | UX-1        | 🟢 Completed     | AGENT       |
| UX-3   | Accessibility pass                | WCAG 2.1 AA checklist, focus states, screen reader labels                 | UX-2        | 🔴 Not Started   | AGENT       |
| UX-4   | Theming hooks & branding          | Tenant theme variables, logo slots, report header/footer variables        | UX-1        | 🔴 Not Started   | AGENT       |

## Phase 4 – Telemetry & Error Reporting

| ID     | Task                              | Description                                                               | Dependecies | Status           | Assigned To |
|--------|-----------------------------------|---------------------------------------------------------------------------|-------------|------------------|-------------|
| OBS-1  | Analytics integration (opt-in)    | Self-hosted endpoint config; privacy toggles                              | FND-1       | 🔴 Not Started   | AGENT       |
| OBS-2  | Error/crash reporting             | Client/server reporters with PII redaction                                | FND-1       | 🔴 Not Started   | AGENT       |
| OBS-3  | Audit log domain model            | Append-only storage pattern scaffold                                      | FND-3       | 🟢 Completed     | AGENT       |

## Phase 5 – Customization & Modularity Scaffold

| ID      | Task                              | Description                                                               | Dependecies | Status           | Assigned To |
|---------|-----------------------------------|---------------------------------------------------------------------------|-------------|------------------|-------------|
| CFG-1   | Config schemas                    | TenantConfig, VesselConfig, FeatureFlag, TemplateRegistry, PolicyRule     | FND-3       | 🔴 Not Started   | AGENT       |
| CFG-2   | Config precedence + merger        | Default → tenant → vessel → device/user; precedence resolution            | CFG-1       | 🔴 Not Started   | AGENT       |
| CFG-3   | Edge loader & hot-reload          | Load/sync configs/templates to edge; signed bundle verification           | CFG-2       | 🔴 Not Started   | AGENT       |
| CFG-4   | Template packs loader             | Seed starter Flag/Class packs; registry and retrieval                     | CFG-1       | 🔴 Not Started   | AGENT       |
| CFG-5   | Policy engine (MVP)               | Rule DSL for field visibility/required/validation                         | CFG-1       | 🔴 Not Started   | AGENT       |
| CFG-6   | Config change workflow + audit    | Draft → review → activate; append-only audit events                       | CFG-2       | 🔴 Not Started   | AGENT       |

## Phase 6 – API Docs & PWA Enhancements

| ID     | Task                              | Description                                                               | Dependecies | Status           | Assigned To |
|--------|-----------------------------------|---------------------------------------------------------------------------|-------------|------------------|-------------|
| DX-1   | OpenAPI spec                      | Author and embed OpenAPI YAML/JSON; serve at `/openapi.(yaml|json)`       | FND-2       | 🟢 Completed     | AGENT       |
| DX-2   | Swagger UI                        | Serve interactive docs at `/docs`                                         | DX-1        | 🟢 Completed     | AGENT       |
| DX-3   | REST client file                  | VS Code REST collection for common requests                               | DX-1        | 🟢 Completed     | AGENT       |
| PWA-1  | Tenants→Vessels page              | Read-only list of vessels by tenant in the web app                        | UX-2        | 🟢 Completed     | AGENT       |
| PWA-2  | Header Docs link + logout toast   | Add Docs button and logout feedback                                       | UX-2        | 🟢 Completed     | AGENT       |

## Phase 7 – Logbooks Core (Bridge & Engine)

| ID     | Task                              | Description                                                               | Dependecies | Status           | Assigned To |
|--------|-----------------------------------|---------------------------------------------------------------------------|-------------|------------------|-------------|
| LOG-1  | DB schema                         | `logbook_entries` table + indexes                                         | FND-3       | 🟢 Completed     | AGENT       |
| LOG-2  | API create/list                   | `POST/GET /logbooks/{type}` with auth + audit                             | AUTH-2      | 🟢 Completed     | AGENT       |
| LOG-3  | API correction/countersign        | `POST /logbooks/{type}/{id}/(correction|countersign)` + audit             | AUTH-5      | 🟢 Completed     | AGENT       |
| LOG-4  | OpenAPI update                    | Add logbooks endpoints + schemas                                          | DX-1        | 🟢 Completed     | AGENT       |
| LOG-5  | PWA pages (skeleton)              | List/create basic entries; role‑aware countersign (stub)                  | UX-2        | 🔴 Not Started   | AGENT       |
