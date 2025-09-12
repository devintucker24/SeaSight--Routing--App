# Product Requirements Document (PRD)
This document formalizes the idea and defines the what and the why of the product the USER is building.

## Section Explanations
| Section           | Overview |
|-------------------|--------------------------|
| Summary           | Sets the high-level context for the product. |
| Goals             | Articulates the product's purpose — core to the "why". |
| Target Users      | Clarifies the audience, essential for shaping features and priorities. |
| Key Features      | Describes what needs to be built to meet the goals — part of the "what". |
| Success Criteria  | Defines what outcomes validate the goals. |
| Out of Scope      | Prevents scope creep and sets boundaries. |
| User Stories      | High-level stories keep focus on user needs (why) and guide what to build. |
| Assumptions       | Makes the context and unknowns explicit — essential for product clarity. |
| Dependencies      | Identifies blockers and critical integrations — valuable for planning dependencies and realism. |

## Summary
A modern, hybrid Safety Management System (SMS) and Digital Logbook platform to replace NS5, focused on usability for mariners, rigorous compliance (IMO/Flag/Class/PSC/ILO/privacy/ISO/ICS/ITU), offline‑first operation onboard, and seamless fleet oversight and reporting ashore.

## Goals
- Make usability and crew-first simplicity a top priority: fast, obvious navigation, minimal input burden, and low training overhead.
- Deliver a unified SMS + Digital Logbook experience that crews actually enjoy using.
- Support fully offline operations onboard with robust, resumable sync to shore.
- Provide tamper‑evident, append‑only records with daily sealing and digital signatures.
- Comply with maritime and data regulations across fleets and jurisdictions.
- Equip shore teams with dashboards, KPIs, and inspection‑ready export packs.

## Target Users
- Crew (authors): create logbook entries, complete checklists, draft work orders.
- Master (reviewer): countersign logs, approve work orders and requisitions.
- Chief Engineer / Chief Mate (reviewers): approve/assign engineering/deck tasks, countersign logs.
- Safety Officer / DPA: manage drills, incidents, audits, NCRs.
- Fleet Manager: shore dashboards, KPIs, compliance reports.
- Auditor/Inspector: read‑only access and exports; no edits.

## Key Features
- Digital Logbooks: Bridge, Engine Room, GMDSS Radio, ORB I, Garbage (Annex V), with correction workflow.
- SMS Core: Procedures (view/acknowledge), Checklists (departure/arrival/drills), Incidents/NCRs, Drills Register.
- Approvals & Countersignature: role‑based review and signing flows (PIN/biometric), UTC stamping.
- Offline‑First & Sync: local-first data, incremental/resumable sync, field‑level LWW, Conflict Inbox for sensitive items.
- Compliance & Integrity: append‑only storage, hash chaining, daily sealing, configurable retention and residency.
- Reporting & Exports: IMO/Class/Flag templates, CSV/JSON, daily sealed PDFs with hash + QR, audit pack generator.
- Integrations (MVP+): Crew Management, CMMS (dual‑run), Document Portal; later NMEA/Sensors and ERP/Procurement.
- Fleet & Admin: dashboards, KPIs, vessel/company configuration, RBAC and audit logs.
- Crew‑First UX & Navigation: role‑aware home screens, quick actions for frequent tasks, guided flows, large touch targets, keyboard shortcuts, offline performance budget (<200 ms common interactions), accessibility (WCAG 2.1 AA), localization/multi‑language.
- Feedback & Telemetry (privacy‑aware): opt‑in usage analytics, in‑app feedback prompts, error reporting to inform UX iteration.
- Inspector/Audit Mode: one‑click, time‑bounded read‑only portal with prebuilt forms (ORB I/II, GRB, GMDSS, Deck/Engine), daily sealed PDFs.
- Evidence Handling & Redaction: hashed attachments, EXIF capture, face blurring/redaction workflow, chain‑of‑custody metadata.
- Updates & Distribution: OTA delta updates (digitally signed), resumable; port‑window updates with DPA approval; USB package for air‑gapped.
 - PMS (Planned Maintenance) & Inventory: PM schedules, work orders, parts/stock, counters, and requisitions with approvals.
 - Requisitions: low‑stock alerts, approval workflows, and synchronization to shore systems.

## Success Criteria
- Reduce audit preparation time by ~50%.
- Achieve crew adoption (NPS > 70%).
- Drive near‑zero PSC findings attributable to documentation/logging.
- MVP delivered within 6–9 months.
- Usability: System Usability Scale (SUS) ≥ 80 with crew users; median task completion time reduced by 30–50% vs. NS5 baselines; first‑day training under 60 minutes for core flows.

## Current Implementation Snapshot
- Edge Dev Stack: Dockerized Postgres + Adminer with idempotent seeds for two demo tenants (Demo Shipping, Oceanic Logistics) and vessels. Migrations and init scripts live under `apps/edge/db`.
- Edge API (Go): Healthcheck, Tenants list/get, Vessels by tenant, Auth (set PIN, login, logout, me), CORS in dev, request logging and request IDs. JSON fields standardized (e.g., `id/name/region`).
- Sessions & RBAC: Session tokens with expiry/revocation; roles per user; `/me` returns roles for role‑aware UI.
- PWA Shell (React + Vite): Login form with tenant selector, dev quickstart, role‑aware home, design tokens, and Vite proxy to avoid CORS in dev.
- Dev QoL: Makefile targets, test scripts, and an HTML root page for the API.

## Out of Scope (MVP)
- Full sensor/NMEA ingestion and auto‑population (planned later).
- Deep ERP/procurement automation (phased after MVP).
- Advanced analytics/ML; focus on reliable reports first.
- Multi‑tenant control plane features beyond single‑tenant deployments (optional, later).
- Native mobile feature parity (initial focus is desktop/PWA; mobile/tablets follow).
- AI‑driven data analytics and optimization; reserved for a post‑MVP roadmap once sufficient operational data is collected.
 - PTW (Permit to Work), Risk Assessments, Audits, Crew Certifications (Phase 2 focus).

## User Stories (sample)
- As Crew, I create a logbook entry with auto‑populated fields, attach evidence, and sign with my PIN/biometric.
- As Master, I review and countersign the day’s Bridge and Engine logs and approve critical work orders.
- As Safety Officer, I record a drill, mark attendance, attach photos, and generate a drill report PDF.
- As Chief Engineer, I approve a PM task with a checklist, parts consumption, and automatic logbook note.
- As Fleet Manager, I view KPIs and generate a date‑range audit pack for a vessel.
- As Auditor, I access read‑only sealed PDFs and CSV exports without editing rights.

## Assumptions
- Each vessel has a shipboard mini‑PC/server with Docker and sufficient storage (5–15 GB/year data growth).
- Connectivity is intermittent; time synchronization (NTP/GPS) is available for accurate UTC stamps.
- Digital sealing (hash chain + daily seals) and PIN/biometric signatures are acceptable to regulators.
- Single‑tenant per company for MVP; multi‑tenant SaaS is optional and phased.
- PostgreSQL on ship and shore, SQLite on devices; Go or Node/NestJS backend; React PWA/Electron desktop; Flutter mobile.
- Usage analytics, if enabled, will be privacy‑preserving, opt‑in, and compliant with GDPR/CCPA/PDPA.
- A lightweight design system and UX guidelines will be established early to ensure consistency and speed.
 - Devices/OS: Windows 10/11 bridge PCs, Linux mini‑server (Docker), iOS/Android rugged tablets (10–12").
 - Languages: MVP UI English; Phase 2 adds Spanish, Tagalog, Mandarin, Russian; exports may be bilingual per Flag.
 - Data residency: EU fleets in EU region (e.g., AWS Frankfurt), US fleets in US regions; shipboard always local with encrypted sync.
- Sync targets: routine logs may sync daily (≤24h acceptable), incidents/NCRs targeted <1h via satcom when available.
 - MVP scope includes PMS (PM tasks and schedules), Inventory/Parts, and Requisitions alongside Logbooks and Checklists.

## Dependencies
- Identity: Onboard local auth (PIN/biometric), shore OIDC/SAML SSO + MFA.
- Datastores: PostgreSQL (ship + shore), SQLite (device caches).
- Packaging/Runtime: Docker for shipboard stack; cloud hosting for shore services.
- Libraries/Services: PDF generation, cryptographic hashing/signature libs, template sets for IMO/Class/Flag.
- Time Services: NTP/GPS time for UTC sealing and signatures.
- Integrations: Crew Management, CMMS, Document Portal (initial); NMEA/ERP later.
- Design & UX: design system (tokens, components), Storybook (or equivalent), usability testing process and tooling.
- Telemetry: self‑hosted, privacy‑aware analytics (e.g., PostHog/Matomo) and crash/error reporting.
 - Certification Targets: Flags (USCG, MCA, Panama, Liberia) and Class (ABS first, then DNV/LR) for approvals.
 - Templates/Forms: IMO A.916(22), MEPC.312(74), class‑approved PDF layouts for ORB I/II, GRB, GMDSS, Deck/Engine.
 - Update Infrastructure: code signing, delta packaging, OTA distribution, and USB package tooling.
