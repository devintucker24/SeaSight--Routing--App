# Version Design Document : v0.1.0-foundations
Technical implementation and design guide for the upcoming version.

## 1. Features Summary
Overview of features included in this version.

- FND-1: RBAC & identity scaffolding (roles/permissions; local onboard auth; shore SSO hooks)
- FND-2: Design system & navigation shell (tokens, core components, role-aware home, quick actions, a11y)
- EDGE-1: Edge stack baseline (Dockerized API, DB, Files, Worker, Sealing, Sync)
- OBS-1: Telemetry & error reporting (privacy-aware analytics, crash/error reporting, feature flags)

## 2. Technical Architecture Overview
High-level structure for this version.

- Client
  - React PWA shell (optionally Electron wrapper later) with routing, role-aware home, and initial components.
  - Design System: tokens (colors/typography/spacing), base components (Button, Input, Select, Table, Modal, Toast), layout grid.
  - Accessibility: WCAG 2.1 AA targets; keyboard navigation; large touch targets; dark/night mode groundwork.

- Identity & RBAC
  - Roles: Author, Reviewer, Admin, Auditor; permissions mapped to feature flags.
  - Auth: local onboard accounts (PIN) with password/PIN hashing; shore SSO (OIDC/SAML) placeholders and config stubs.
  - Session: offline-capable session storage with device binding; audit events on login/logout.

- Edge Stack (Shipboard)
  - Services: API Gateway, Core Service, Sealing Service (stub), Sync Service (stub), Files/Blob Service, Worker.
  - Data: PostgreSQL 15 for edge; migrations and seed data (roles/users/dev vessel).
  - Packaging: Docker Compose for local edge stack with explicit healthchecks; Makefile targets.

- Observability
  - Analytics: self-hosted, privacy-aware analytics stub (e.g., PostHog/Matomo endpoint config) with opt-in.
  - Error reporting: client and server reporters (e.g., Sentry-compatible API) with redaction.
  - Audit logging domain model and append-only storage pattern initialized.

## 3. Implementation Notes
- Security
  - Enforce HTTPS/TLS in cloud contexts; TLS-internal optional in dev; config-driven CORS.
  - Secrets via env files in dev; plan Vault/KMS for prod.
  - Minimal PII stored; analytics disabled by default and opt-in per tenant.

- Performance & UX
  - Performance budgets: <200 ms common offline interactions; lazy-load heavy views.
  - Navigation shell optimized for crew workflows with quick actions.
  - Internationalization scaffold (en only now) using i18n library with message keys.

- Data & Migrations
  - Initialize core tables: users, roles, permissions, user_roles, audit_events, feature_flags, tenants, vessels.
  - Seed: demo tenant, vessel, and sample crew roles for early testing.

- Extensibility
  - Modular service boundaries; API-first design; clear package structure for domain models.
  - Feature flag hooks around experimental UI and telemetry.
  - Configuration & Modularity scaffold:
    - Config Schemas: TenantConfig, VesselConfig, FeatureFlag, TemplateRegistry, PolicyRule (JSON-backed + DB projection).
    - Precedence: default → tenant → vessel → device/user (most specific wins) with audit trail.
    - Loader: edge hot-reload of configs and templates; cloud publisher with signed bundles.
    - Theming: design-system tokens overridable per tenant (brand colors/logo, report header/footer).
    - Template Packs: Flag/Class packs (starter set) loaded via TemplateRegistry for forms/PDFs.
    - Policy Engine (MVP): simple rule DSL for field visibility/required/validation; OPA evaluation optional later.
    - Change Workflow: draft → review → activate with immutable history (append-only audit events).

## 4. Other Technical Considerations
- Shipboard hardware variability: target Windows 10/11 bridge PCs + Linux edge box; container resource limits.
- Update windows: document operational constraint (port or DPA-approved) though OTA service lands later.
- Compliance foundations: audit trail schema and immutable-event pattern to support later sealing.
- Testing: unit tests for RBAC guards and auth flows; snapshot tests for core components.
 - Config & Templates: seed minimal example tenant/vessel configs and one sample Flag/Class template to validate the pipeline.

## 5. Open Questions
- Identity: Any immediate SSO providers to prioritize (Azure AD/Okta/Keycloak)?
- Analytics: Preference for self-hosted platform (PostHog vs Matomo) and data residency constraints per tenant?
- Navigation: Specific quick actions to prioritize on the role-aware home for MVP crews?
- Edge DB: Minimum hardware/storage profile we should assume for first vessel pilots?
