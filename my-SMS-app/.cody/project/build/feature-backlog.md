# Feature Backlog

This document lists features and enhancements derived from the plan. It is a living document that will evolve throughout the project. It is grouped by version, with the Backlog tracking all features not added to a version yet. It is used to create versions to work on.

| Status |  | Priority |  |
|--------|-------------|---------|-------------|
| 🔴 | Not Started | High | High priority items |
| 🟡 | In Progress | Medium | Medium priority items |
| 🟢 | Completed | Low | Low priority items |

## Backlog

| ID  | Feature                               | Description                                                                                  | Priority | Status |
|-----|---------------------------------------|----------------------------------------------------------------------------------------------|----------|--------|
| BL-1 | Engine telemetry integration         | NMEA/Modbus/OPC-UA ingestion for auto fields (subject to vendor access)                      | Medium   | 🔴 Not Started |
| BL-2 | Mobile/tablet feature parity         | Extend key flows to Flutter tablets with offline & sync                                      | Medium   | 🔴 Not Started |
| BL-3 | Multi-tenant control plane           | Advanced tenant admin for large fleets                                                       | Low      | 🔴 Not Started |

## v0.1.0-foundations - 🔴 Not Started
RBAC, design system, PWA shell, and edge/cloud baselines.

| ID  | Feature                        | Description                                                              | Priority | Status |
|-----|--------------------------------|--------------------------------------------------------------------------|----------|--------|
| FND-1 | RBAC & identity scaffolding   | Roles/permissions (Author/Reviewer/Admin/Auditor), local auth, SSO hooks | High     | 🔴 Not Started |
| FND-2 | Design system & nav shell     | Tokens, core components, a11y, role-aware home & quick actions           | High     | 🔴 Not Started |
| EDGE-1 | Edge stack baseline          | Dockerized API, DB, Files, Worker, Sealing, Sync                         | High     | 🔴 Not Started |
| OBS-1 | Telemetry & error reporting   | Privacy-aware analytics, crash/error reporting, feature flags            | Medium   | 🔴 Not Started |

## v0.1.1-offline-sync - 🔴 Not Started
Offline-first data layer and conflict handling.

| ID  | Feature                        | Description                                                              | Priority | Status |
|-----|--------------------------------|--------------------------------------------------------------------------|----------|--------|
| SYNC-1 | Local-first datastore         | Change capture, vectors, delta protocol, resumable transport             | High     | 🔴 Not Started |
| SYNC-2 | Conflict inbox                | Field-level LWW with review workflow for sensitive records               | High     | 🔴 Not Started |
| SYNC-3 | Bandwidth-aware scheduling    | At-sea constraints, prioritized incident push (<1h), daily batch         | High     | 🔴 Not Started |

## v0.1.2-logbooks-bridge-engine - 🔴 Not Started
Bridge and Engine logs with core flows.

| ID   | Feature                       | Description                                                              | Priority | Status |
|------|-------------------------------|--------------------------------------------------------------------------|----------|--------|
| LOG-1 | Bridge & Engine logs          | Entry schemas, auto fields, keyboard shortcuts, watchkeeping mode        | High     | 🔴 Not Started |
| LOG-3 | Correction workflow           | Transparent strike-through, reason codes, approvals                      | High     | 🔴 Not Started |
| LOG-4 | Countersignature              | Role-based review/sign (PIN/biometric where available)                   | High     | 🔴 Not Started |

## v0.1.3-logbooks-gmdss-orb-garbage - 🔴 Not Started
Remaining regulated logbooks and validations.

| ID   | Feature                       | Description                                                              | Priority | Status |
|------|-------------------------------|--------------------------------------------------------------------------|----------|--------|
| LOG-2 | GMDSS, ORB I, Garbage logs    | Templates aligned to IMO/Class; validations                              | High     | 🔴 Not Started |

## v0.1.4-checklists - 🔴 Not Started
SMS checklists linked to logs and WOs.

| ID   | Feature                       | Description                                                              | Priority | Status |
|------|-------------------------------|--------------------------------------------------------------------------|----------|--------|
| SMS-1 | Checklists engine             | Departure/arrival/drills; linkbacks to logs and WOs                      | High     | 🔴 Not Started |

## v0.1.5-pms-core - 🔴 Not Started
PM schedules and work orders.

| ID   | Feature                       | Description                                                              | Priority | Status |
|------|-------------------------------|--------------------------------------------------------------------------|----------|--------|
| PMS-1 | PM schedules & work orders    | Equipment, counters, schedules, WOs, history                             | High     | 🔴 Not Started |

## v0.1.6-inventory-requisitions - 🔴 Not Started
Inventory and requisitions workflows.

| ID   | Feature                       | Description                                                              | Priority | Status |
|------|-------------------------------|--------------------------------------------------------------------------|----------|--------|
| INV-1 | Inventory & parts catalog     | Items, stock, low-stock alerts                                           | High     | 🔴 Not Started |
| REQ-1 | Requisitions & approvals      | Create from low stock; approval workflow; sync to shore                  | High     | 🔴 Not Started |

## v0.1.7-sealing-pdfs - 🔴 Not Started
Immutability and sealed PDFs.

| ID   | Feature                       | Description                                                              | Priority | Status |
|------|-------------------------------|--------------------------------------------------------------------------|----------|--------|
| SEC-1 | Hash chain & daily seal       | Append-only chain, daily anchoring, UTC stamping                         | High     | 🔴 Not Started |
| SEC-2 | Sealed PDF renderer           | Class-approved layouts; QR/hash verification                             | High     | 🔴 Not Started |

## v0.1.8-inspector-auditpack - 🔴 Not Started
Inspection readiness.

| ID   | Feature                        | Description                                                              | Priority | Status |
|------|--------------------------------|--------------------------------------------------------------------------|----------|--------|
| INSP-1 | Inspector portal (shell)      | Read-only portal scaffold, time-bounded access                           | Medium   | 🔴 Not Started |
| RPT-1  | Audit pack generator          | Date-range ZIP with manifests, sealed PDFs, CSV/JSON                     | Medium   | 🔴 Not Started |

## v0.1.9-ux-iteration - 🔴 Not Started
Telemetry-driven UX iteration.

| ID   | Feature                        | Description                                                              | Priority | Status |
|------|--------------------------------|--------------------------------------------------------------------------|----------|--------|
| OBS-2 | UX iteration round 1           | Crew testing feedback loop; refine forms, nav, performance               | Medium   | 🔴 Not Started |

## v0.2.0-ptw - 🔴 Not Started
Permit-to-Work.

| ID   | Feature                         | Description                                                              | Priority | Status |
|------|---------------------------------|--------------------------------------------------------------------------|----------|--------|
| PTW-1 | Permit-to-Work                  | Issuance, approvals, linkage to tasks/logs                               | High     | 🔴 Not Started |

## v0.2.1-risk - 🔴 Not Started
Risk assessments.

| ID    | Feature                        | Description                                                              | Priority | Status |
|-------|--------------------------------|--------------------------------------------------------------------------|----------|--------|
| RISK-1 | Risk assessments               | JSA templates, hazards/controls, approvals                               | High     | 🔴 Not Started |

## v0.2.2-incidents - 🔴 Not Started
Incidents and NCRs.

| ID   | Feature                         | Description                                                              | Priority | Status |
|------|---------------------------------|--------------------------------------------------------------------------|----------|--------|
| SAF-1 | Incidents/NCRs                  | Reporting, evidence, priority sync (<1h)                                 | High     | 🔴 Not Started |

## v0.2.3-audits - 🔴 Not Started
Audits and certifications.

| ID   | Feature                         | Description                                                              | Priority | Status |
|------|---------------------------------|--------------------------------------------------------------------------|----------|--------|
| AUD-1 | Audits                          | Checklists, findings, CAPA, reports                                      | Medium   | 🔴 Not Started |
| SIG-1 | X.509/smartcard signatures      | Smartcard certificate support for eORB submissions                        | Medium   | 🔴 Not Started |

## v0.2.4-crew-certs - 🔴 Not Started
Crew certifications tracking.

| ID     | Feature                        | Description                                                              | Priority | Status |
|--------|--------------------------------|--------------------------------------------------------------------------|----------|--------|
| CREW-1 | Crew certifications            | Certificate tracking, expiries, alerts                                   | Medium   | 🔴 Not Started |

## v0.3.0-integrations-cmms - 🔴 Not Started
CMMS adapters.

| ID    | Feature                        | Description                                                              | Priority | Status |
|-------|--------------------------------|--------------------------------------------------------------------------|----------|--------|
| INT-1 | CMMS bridges                    | AMOS/Sertica/NS5/Star IS dual-run adapters                               | Medium   | 🔴 Not Started |

## v0.3.1-integrations-crew - 🔴 Not Started
Crew management adapters.

| ID    | Feature                        | Description                                                              | Priority | Status |
|-------|--------------------------------|--------------------------------------------------------------------------|----------|--------|
| INT-2 | Crew management adapters        | Adonis/TM Master/Compas connectors                                       | Medium   | 🔴 Not Started |

## v0.3.2-integrations-erp - 🔴 Not Started
ERP/Procurement adapters.

| ID    | Feature                        | Description                                                              | Priority | Status |
|-------|--------------------------------|--------------------------------------------------------------------------|----------|--------|
| INT-3 | ERP/Procurement adapters        | SAP/Oracle/Dynamics for requisitions                                     | Medium   | 🔴 Not Started |

## v0.3.3-i18n - 🔴 Not Started
Multilingual UI and exports.

| ID     | Feature                        | Description                                                              | Priority | Status |
|--------|--------------------------------|--------------------------------------------------------------------------|----------|--------|
| I18N-1 | Multilingual UI/exports        | Spanish/Tagalog/Mandarin/Russian + bilingual exports                     | Medium   | 🔴 Not Started |

## v0.3.4-ai-assist - 🔴 Not Started
AI assist (limited).

| ID  | Feature                           | Description                                                              | Priority | Status |
|-----|-----------------------------------|--------------------------------------------------------------------------|----------|--------|
| AI-1 | AI assist (limited)              | Suggestions for checklists/logs; anomaly flags                           | Low      | 🔴 Not Started |

## v0.3.5-pdm-groundwork - 🔴 Not Started
Predictive maintenance groundwork.

| ID    | Feature                         | Description                                                              | Priority | Status |
|-------|---------------------------------|--------------------------------------------------------------------------|----------|--------|
| PDM-1 | Predictive maintenance groundwork| Counters, trends, failure signals                                        | Low      | 🔴 Not Started |

## v0.4.0-voice - 🔴 Not Started
Voice-to-logbook.

| ID     | Feature                        | Description                                                              | Priority | Status |
|--------|--------------------------------|--------------------------------------------------------------------------|----------|--------|
| VOICE-1 | Voice-to-logbook               | Offline speech-to-text tuned for maritime terms                          | Medium   | 🔴 Not Started |

## v0.4.1-kpis - 🔴 Not Started
Predictive KPIs.

| ID   | Feature                         | Description                                                              | Priority | Status |
|------|---------------------------------|--------------------------------------------------------------------------|----------|--------|
| KPI-1 | Predictive KPIs                 | Leading indicators for compliance, maintenance                           | Medium   | 🔴 Not Started |

## v0.4.2-fleet-ai - 🔴 Not Started
Fleet-level AI insights.

| ID  | Feature                          | Description                                                              | Priority | Status |
|-----|----------------------------------|--------------------------------------------------------------------------|----------|--------|
| AI-2 | Fleet AI                         | Cross-vessel insights and recommendations                                | Low      | 🔴 Not Started |
