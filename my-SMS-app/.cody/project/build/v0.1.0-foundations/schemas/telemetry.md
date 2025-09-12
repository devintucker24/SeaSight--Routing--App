# Telemetry & Error Reporting Schemas

Minimal, privacy-aware shapes for usage analytics and crash/error reporting. Disabled by default; opt-in per tenant.

## Interfaces
```ts
interface TelemetryConfig {
  analyticsOptIn: boolean;
  errorReporting: boolean;
}

interface UsageEvent {
  id: string;           // uuid
  tenantId: string;     // uuid
  vesselId?: string;    // uuid
  userId?: string;      // uuid (hashed/pseudonymized if required)
  kind: string;         // e.g., "ui.click", "form.submit", "nav.route"
  props?: Record<string, string | number | boolean>;
  createdAt: string;    // ISO
}

interface ErrorEvent {
  id: string;           // uuid
  tenantId: string;     // uuid
  vesselId?: string;    // uuid
  userId?: string;      // uuid
  message: string;      // scrubbed
  stack?: string;       // scrubbed or symbolicated server-side
  context?: Record<string, unknown>;
  createdAt: string;    // ISO
}
```

## PostgreSQL DDL (optional, if self-hosted)
```sql
create table if not exists usage_events (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  vessel_id uuid references vessels(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  kind text not null,
  props jsonb,
  created_at timestamptz not null default now()
);

create table if not exists error_events (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  vessel_id uuid references vessels(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  message text not null,
  stack text,
  context jsonb,
  created_at timestamptz not null default now()
);
```

## Privacy Considerations
- Default to analyticsOptIn = false; enable per tenant with clear consent.
- Redact PII from events; prefer IDs/refs over raw content.
- Respect residency: route events to regional storage endpoints.

