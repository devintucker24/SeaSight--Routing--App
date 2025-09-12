# Product Implementation Plan
This document defines how the product will be built and when.

## Overview
Implement a hybrid Safety Management System and Digital Logbook to replace NS5, prioritizing offline‑first shipboard operations, compliant recordkeeping (hash‑chained, sealed, signed), and shore‑side reporting and fleet oversight. MVP focuses on five regulated logbooks and core SMS features with robust sync and audit‑ready exports.

Current Status (as of latest refresh):
- Edge database and seeds up (Demo Shipping, Oceanic Logistics with vessels and roles)
- Edge API online: health, tenants, vessels by tenant, auth (set PIN, login, logout, me)
- PWA shell online: tenant selector, login, role-aware home, Vite proxy for API

## Architecture
- Client–Server, Hybrid Edge + Cloud.
  - Shipboard Edge: Dockerized services (API, Sync, Sealing, File/Blob, Job Worker) with PostgreSQL; local device caches in SQLite; React PWA/Electron desktop client; optional Flutter tablets.
  - Shore Cloud: API + Sync gateway, Reporting/ETL to data lake, dashboards (React PWA), tenant isolation per company.
- Offline‑First Data Model:
  - Local‑first writes; background replication using incremental, resumable sync.
  - Conflict strategy: Field‑level Last‑Writer‑Wins plus Conflict Inbox for sensitive records.
  - Versioning with vector clocks/change stamps.
- Security & Compliance:
  - RBAC aligned to roles; immutable append‑only log streams; daily seal process (hash chain + daily anchor).
  - Digital signatures: PIN/biometric; optional X.509; UTC time via NTP/GPS.
  - Encryption in transit (TLS) and at rest (Postgres TDE/disk, secrets vault); configurable residency and retention.
- Tech Stack:
  - Frontend: React PWA (desktop, Electron wrapper) and Flutter (mobile/tablets later).
  - Backend: Go (preferred) or Node/NestJS services; gRPC/HTTP APIs.
  - Storage: PostgreSQL (edge + cloud); SQLite (device caches); S3‑compatible blob store for attachments.
  - Messaging/Jobs: lightweight queue (e.g., Redis/NATS) for sealing, PDF generation, sync compaction.
- Usability & Design System:
  - Design tokens + component library with Storybook; navigation patterns optimized for crew workflows; performance budgets (<200 ms common interactions offline, <1 s perceived for list/navigation); accessibility (WCAG 2.1 AA); localization framework.
- Telemetry & Experimentation (privacy‑aware, opt‑in):
  - Self‑hosted analytics for usage flows, error/crash reporting, feature flags for iterative UX improvements.
 - Updates & Distribution:
   - Digitally signed OTA delta updates with resumable downloads; update windows limited to in‑port or with DPA approval; USB update packages for air‑gapped ships.
 - Network/Bandwidth Constraints:
   - Assume 256 kbps–2 Mbps at sea; schedule bulk syncs and updates alongside; incidents/NCRs use prioritized push (<1h target).
 - Regional Hosting/Residency:
   - EU fleets hosted in EU (e.g., AWS Frankfurt); US fleets in US regions; configurable residency per tenant.

## Components
- Identity & RBAC: local onboard auth (PIN/biometric), shore SSO (OIDC/SAML), MFA shore‑side; role/permission mapping.
- Logbooks Service: Bridge, Engine Room, GMDSS, ORB I, Garbage; entry schemas, correction flow, countersignature.
- SMS Service: Procedures, Checklists, Incidents/NCRs, Drills Register.
- PMS Service: PM schedules, counters, work orders, and maintenance history.
- Inventory & Requisitions: parts/items, stock levels, low‑stock alerts, requisitions and approvals.
- Sync Service: delta generation, resumable uploads, conflict detection, vector clocks.
- Sealing & Integrity: append‑only streams, hash chaining, daily seal and notarization, signature capture.
- Reporting & Exports: templates (IMO/Class/Flag), daily sealed PDFs + QR/hash, CSV/JSON, audit pack generator.
- Fleet Dashboards: KPIs, compliance views; vessel/company configuration.
- Integrations: Crew Management, CMMS (dual‑run), Document Portal; hooks for future NMEA/ERP.
- Observability: audit log, metrics, shipboard health status, sync telemetry.
- Design System & UX: component library, navigation shell, quick actions, coach marks/training, localization.
- Telemetry & Feedback: analytics, feature flags, in‑app feedback.
- Update Service: OTA/USB package builder, signer, shipboard updater with approval workflow.
- Evidence Pipeline: attachment hashing, EXIF capture, redaction/face blurring, chain‑of‑custody metadata.
- Inspector Portal: time‑bounded read‑only access with predefined forms and sealed PDF access.

## Data Model
- Core: Company/Tenant, Vessel, User, Role, Permission, DeviceRegistration.
- Operations: Voyage/Passage, LogbookEntry (subtypes: Bridge, Engine, GMDSS, ORB I, Garbage), Checklist, Procedure, Incident, Drill.
- Maintenance/Inventory (MVP scope limited): WorkOrder, Requisition, Part/InventoryItem.
- Integrity: Signature, Seal, HashLink, AuditEvent.
- Sync: ChangeSet, VectorClock, ConflictRecord, SyncSession.
- Files: Attachment (blob with metadata and hash).
 - Updates & Evidence: UpdatePackage, UpdateApproval, UpdateWindow; RedactionRule, RedactedAsset.

## Major Technical Steps
- Foundation
  - Bootstrap repos, CI, code style, shared domain models, RBAC scaffolding.
  - Set up shipboard Docker stack (API, DB, Sync, Sealing, Files, Worker) and cloud baseline.
  - Establish design system (tokens, components) and navigation shell; Storybook and a11y linting.
- Offline & Sync
  - Implement local‑first store, change capture, vector clocks, delta protocol, resumable transport.
  - Build Conflict Inbox UI/flows; field‑level LWW policy plumbing.
- PMS & Inventory
  - Define PM models (equipment, counters, schedules, tasks) and workflows for work orders.
  - Build inventory/parts catalog, stock tracking, low‑stock alerts; implement requisition creation and approvals.
- Logbooks
  - Define schemas and validation; create entry UI with auto‑fields; correction workflow; countersignature.
  - Daily sealing pipeline; per‑entry hash and chain linkage; sealed PDF renderer.
- SMS Core
  - Procedures (view/acknowledge), Checklists engine, Incidents/NCRs, Drills Register with reports.
- Reporting & Exports
  - Template library; PDF/CSV/JSON exports; audit pack (range → zip + manifest + seals).
- Fleet & Admin
  - Dashboards, KPIs; tenant/vessel configuration; audit logging.
- Hardening
  - Security review, performance testing on edge hardware; backup/restore; residency/retention controls.
  - Usability testing (crew tasks); iterate on navigation, forms, and checklists; accessibility audits.
- Pilot
  - Shipboard pilot on 1–2 vessels; feedback loop; regulator readiness checks.
 - Updates & Distribution
   - Implement code signing, delta packaging, OTA service, shipboard updater with approval and rollback; USB update flow.
 - Evidence & Redaction
   - Build hashing/EXIF capture and redaction pipeline; configurable masking for GDPR/Flag requirements.

## Tools & Services
- Go or Node/NestJS services; React + Electron; Flutter later.
- PostgreSQL, SQLite; S3‑compatible storage; Redis/NATS for jobs.
- PDF library (e.g., wkhtmltopdf/Chromium or Go/Node pdf libs); crypto libs for hashing/signing.
- NTP/GPS time sync; secrets management (e.g., Vault or cloud KMS).
- CI/CD, container registry; IaC for cloud (Terraform).
- UX Tooling: Storybook, ESLint + a11y plugins, Lighthouse/axe; self‑hosted analytics (e.g., PostHog/Matomo), Sentry‑style error reporting; feature flagging.
 - Updates: code signing (e.g., Cosign/GPG), delta update tooling (e.g., zsync/rsync‑based or custom), OTA orchestrator.
 - i18n: react‑i18next/formatjs (web), Flutter intl for mobile; LTR/RTL readiness for future locales.
 - Image/Video: on‑device face blurring/redaction libs; metadata scrubbing.

## Risks & Unknowns
- Regulator acceptance of digital signatures and sealing; flag‑specific nuances.
- Offline complexity: merge conflicts, device clock drift, partial uploads.
- Hardware variability onboard; storage/perf constraints vs. data growth (5–15 GB/year).
- Data residency per customer; cross‑region replication strategy.
- PKI management for optional X.509; key custody and rotation.
- Template maintenance burden across IMO/Class/Flag variants.
- Usability across diverse user skill levels and languages; ensuring quick training and minimal cognitive load.
- Analytics/telemetry compliance and privacy constraints in certain jurisdictions.
 - OTA reliability over satcom; update windows coordination; USB supply chain risks and malware hygiene.
 - Vendor‑locked engine telemetry limiting auto‑populate features; dependency on operator permissions.

## Milestones
- Phase MVP (0.1.x): Foundations, offline/sync, PMS, Logbooks, Checklists, Inventory, Requisitions; sealed PDFs for inspection equivalence.
- Phase 2 (0.2.x): PTW, Risk Assessments, Incidents/NCRs, Audits, Crew Certifications.
- Phase 3 (0.3.x): Integrations (CMMS/ERP/Crew), Predictive Maintenance groundwork, AI Assist (limited), Multilingual UI/exports.
- Phase 4 (0.4.x): Differentiators — voice‑to‑logbook, predictive KPIs, fleet‑level AI insights.
- Parallel Tracks: Updates/OTA (ready by pilot), Inspector Portal (pilot), localization groundwork, certification with ABS → DNV/LR.

## Environment Setup
- Prereqs: Docker + Compose, Node 20+, Go 1.22+, Make.
- Edge stack:
  - `cd apps/edge && cp .env.example .env && docker compose up -d`
  - Adminer: http://localhost:8080 • API: http://localhost:8081
  - Optional: `make -C apps/edge seed-oceanic` to add a second tenant
- Web app:
  - `cd apps/web && cp .env.example .env && npm install && npm run dev`
  - Dev: http://localhost:5173 (proxy to API at `/api`)
- Auth (dev): use tenant selector and sign in as `admin / 1234`, or Dev Quickstart.

## Testing & QA Plan (Deferred)
We will set up testing tools when they add the most value, to keep momentum high now. Notes for when to plug them in:

- Now (manual smoke):
  - Swagger UI at `/docs` and REST file `.cody/project/library/docs/edge-api.http` for quick API checks.

- v0.1.0 hardening (auth/RBAC stable):
  - Go handler tests (`go test ./...`) for health, tenants, login, `/me`, and role guards.
  - Linters and vuln scan in CI: `golangci-lint`, `govulncheck`.

- v0.1.1 (offline/sync scaffold):
  - `testcontainers-go` Postgres for integration tests.
  - k6 smoke for `/healthz`, `/tenants`, `/vessels`.

- v0.1.2–0.1.3 (logbooks UI):
  - Playwright E2E for login → basic logbook flow; axe/Lighthouse for a11y/perf.

- Pre‑pilot:
  - OpenAPI lint (Spectral) + `swagger-cli validate` in CI.
  - Trivy image scan and OWASP ZAP baseline against local API.

We’ll insert these into milestones as we reach each stage.
