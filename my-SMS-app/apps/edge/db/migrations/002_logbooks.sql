-- Logbook entries (bridge, engine) – generic JSON data with audit fields
create table if not exists logbook_entries (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  vessel_id uuid not null references vessels(id) on delete cascade,
  type text not null check (type in ('bridge','engine')),
  ts timestamptz not null default now(),
  data jsonb not null default '{}',
  created_by uuid references users(id) on delete set null,
  correction_requested boolean not null default false,
  correction_reason text,
  correction_by uuid references users(id) on delete set null,
  correction_at timestamptz,
  countersigned_by uuid references users(id) on delete set null,
  countersigned_at timestamptz
);

create index if not exists logbook_entries_tvt_idx on logbook_entries(tenant_id, vessel_id, type, ts desc);

