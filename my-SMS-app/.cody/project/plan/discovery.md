# Discovery
This document captures the raw, unfiltered idea or initial AI prompt that sparked the project.

## Starting Prompt
Goal: To solve the issue of Vessel Safety Management system being old and outdated. Specifically NS5. A system that is complicated and hard to use by mariners. I want to revolutionize SMS systems and integrate Digital Logbooking into the system so it is an all‑in‑one system.

Platform: Desktop first; mobile/tablet later.

Compliance: Must comply with IMO, Flag State Administrations (e.g., USCG, MCA, Panama), Classification Societies (ABS, DNV, Lloyd’s Register, ClassNK, Bureau Veritas, RINA), Port State Control regimes (Paris MoU, Tokyo MoU, USCG PSC), ILO (MLC), EU GDPR, national/regional privacy (e.g., CCPA, PDPA), ISO/IEC (ISO 27001, ISO 9001), ICS best practices, ITU radio/GMDSS logging standards.

Structured scope provided:

project: NS5 Replacement / Digital Logbook & Fleet Platform

users_roles:
  - Crew: create logbook entries, complete checklists, draft work orders
  - Master: countersign logbooks, approve work orders, approve requisitions
  - ChiefEngineer: approve/assign engineering tasks, countersign engine log, requisitions
  - ChiefMate: approve deck tasks, countersign deck log
  - SafetyOfficer/DPA: record drills, incidents, audits, NCRs
  - FleetManager: shore dashboards, KPIs, compliance reports
  - Auditor/Inspector: read-only access, export PDFs, no edits

permissions:
  - Author: create entries, draft tasks
  - Reviewer: approve/countersign tasks/logs
  - Admin: manage vessel config, users, roles
  - Auditor: read-only, export-only

mvp_scope:
  logbooks:
    - BridgeLog
    - EngineRoomLog
    - GMDSSRadioLog
    - ORB_I (Oil Record Book, machinery space)
    - GarbageRecordBook (Annex V)
  sms_features:
    - Procedures (view, acknowledge)
    - Checklists (departure, arrival, drills)
    - Incidents/NCRs
    - DrillsRegister
  top_user_journeys:
    - Complete PM task (checklist + parts + sign-off + auto log)
    - Make logbook entry (auto fields + sign + correction flow)
    - Create requisition from low stock (approval + sync to shore)

offline_sync:
  requirements:
    - Full offline operation onboard
    - Incremental sync when online
    - Resumable uploads
  conflict_resolution:
    - FieldLevelLastWriterWins (default)
    - ConflictInbox for sensitive items (logbooks, permits, inventory counts)
  data_constraints:
    vessel_data_size_per_year: "5-15GB"
    users_per_vessel: "20-200"
    fleet_scale: "10-500+ ships"

deployment:
  model: hybrid (shipboard edge + shore cloud)
  shipboard: miniPC/server + Docker stack
  cloud: dashboards, fleet reporting, data lake
  tenancy: single-tenant per company, multi-tenant SaaS optional

platforms:
  desktop: webApp (PWA) or Electron wrapper
  mobile: Flutter (Android + iOS tablets)
  future: React PWA for shore dashboards

stack_auth:
  frontend: Flutter (mobile), React PWA (desktop)
  backend: Go (preferred) or Node/NestJS
  db: PostgreSQL (ship + shore), SQLite (device)
  auth:
    - Local accounts onboard (PIN/biometric)
    - OIDC/SAML SSO for shore
    - MFA shore-side

data_compliance:
  residency: configurable (EU-only if required)
  retention: "5-10 years logbooks"
  immutability: append-only, hash-chained, daily sealing
  digital_signatures: PIN/biometric + UTC timestamp, optional X.509 certs

integrations:
  now:
    - CrewManagement (certificates, training)
    - Existing CMMS (dual-run)
    - DocumentPortal
  later:
    - NMEA/Sensor feeds (GPS, engine hours, fuel flow)
    - ERP/Procurement (SAP, Oracle, Dynamics)
    - Email integration for exports

reporting_exports:
  formats: [IMOForms, ClassTemplates, FlagLayouts]
  daily_sealed_pdfs: true (hash + QR)
  csv_json_exports: true
  audit_pack_generator: true (date range → zip with manifests + PDFs)

success_timeline:
  mvp_target: "6-9 months"
  metrics:
    - audit_prep_time_reduction: "50%"
    - crew_adoption_nps: ">70%"
    - psc_findings_reduction: "near-zero"

## Questions
AGENT Q1: Who are the primary users and what are their permissions?  
USER A1: Users and roles specified (Crew, Master, ChiefEngineer, ChiefMate, SafetyOfficer/DPA, FleetManager, Auditor/Inspector) with permissions (Author, Reviewer, Admin, Auditor).

AGENT Q2: What are the MVP logbooks and SMS features?  
USER A2: BridgeLog, EngineRoomLog, GMDSSRadioLog, ORB I, GarbageRecordBook; SMS features include Procedures, Checklists, Incidents/NCRs, DrillsRegister.

AGENT Q3: Top user journeys to optimize end‑to‑end?  
USER A3: Complete PM task; Make logbook entry; Create requisition from low stock.

AGENT Q4: Offline/sync behavior and conflict handling?  
USER A4: Full offline; incremental sync; resumable uploads; Field‑level LWW by default; Conflict Inbox for sensitive items.

AGENT Q5: Deployment model and tenancy?  
USER A5: Hybrid (shipboard edge + shore cloud); single‑tenant per company; multi‑tenant SaaS optional.

AGENT Q6: Platforms and tech stack preferences?  
USER A6: Desktop PWA/Electron; Flutter mobile; backend Go or Node/Nest; DB PostgreSQL/SQLite; Auth: onboard local accounts (PIN/biometric), shore SSO (OIDC/SAML) + MFA.

AGENT Q7: Compliance, data residency, retention, and signatures?  
USER A7: Compliance per IMO/Flag/Class/PSC/ILO/GDPR/CCPA/PDPA/ISO/ICS/ITU; configurable residency; 5‑10 year retention; append‑only, hash‑chained with daily sealing; PIN/biometric signatures; optional X.509.

AGENT Q8: Integrations and reporting/export needs?  
USER A8: Now: Crew Mgmt, CMMS, Document Portal. Later: NMEA/Sensors, ERP/Procurement, Email. Exports: IMO/Class/Flag templates, daily sealed PDFs with hash/QR, CSV/JSON, audit pack generator.

AGENT Q9: Success metrics and timeline?  
USER A9: MVP in 6–9 months; reduce audit prep 50%; NPS > 70%; near‑zero PSC findings.

## Discovery Summary
NS5 replacement: a modern, compliant, hybrid (shipboard + cloud) Safety Management and Digital Logbook platform. MVP centers on five regulated logbooks and core SMS features (procedures, checklists, incidents, drills) with rigorous offline‑first operation, secure approvals/countersignatures, and tamper‑evident record sealing. Roles span onboard crew to shore stakeholders and auditors with least‑privilege permissions. Data sync is incremental with field‑level conflict resolution and an exception inbox for sensitive records. Architecture targets React PWA/Electron + Flutter, Go or Node/Nest backend, PostgreSQL/SQLite, and strong auth (local onboard + shore SSO/MFA). Compliance requirements include IMO/Flag/Class/PSC/ILO/privacy and ISO security/quality standards, with configurable data residency and long‑term retention. Reporting delivers standardized forms, daily sealed PDFs, CSV/JSON, and audit packs. Success is measured by adoption, audit‑readiness, and reduced findings within a 6–9 month MVP window.

