# Audit & Integrity Schemas (Foundations)

Establishes audit event structure and groundwork for future hash-chained, sealed records.

## Interfaces
```ts
interface AuditEvent {
  id: string;           // uuid
  tenantId: string;     // uuid
  vesselId?: string;    // uuid
  actorUserId?: string; // uuid
  action: string;       // e.g., "auth.login", "config.activate"
  subjectType?: string; // e.g., "Config", "User"
  subjectId?: string;
  before?: unknown;     // redacted/filtered where needed
  after?: unknown;      // redacted/filtered where needed
  meta?: Record<string, unknown>;
  createdAt: string;    // ISO
}

// Hash link scaffolding for later sealing
interface HashLink {
  id: string;           // uuid
  stream: string;       // e.g., "audit" or specific logbook stream
  seq: number;          // monotonic sequence per stream
  hash: string;         // content hash
  prevHash?: string;    // previous link hash in stream
  createdAt: string;
}
```

## PostgreSQL DDL (append-only audit)
```sql
-- Using .cody/project/build/v0.1.0-foundations/schemas/identity.md as base for audit_events
-- Optional: hash link table to enable chain verification in later versions
create table if not exists hash_links (
  id uuid primary key,
  stream text not null,
  seq bigint not null,
  hash text not null,
  prev_hash text,
  created_at timestamptz not null default now(),
  unique (stream, seq)
);
```

## Notes
- Audit events are append-only; updates are forbidden, deletes restricted to retention policy jobs.
- PII redaction is mandatory for error fields; store references instead of raw sensitive data.
- Hash link table prepares for v0.1.7 "sealing-pdfs" where full chaining and daily seals are implemented.

