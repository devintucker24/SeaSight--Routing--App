-- Init schema (auto-executed by Postgres on first container start)
-- Initial schema for tenancy, identity, RBAC, sessions, audit, telemetry, and hash links
create extension if not exists pgcrypto;

-- Tenancy
create table if not exists tenants (
  id uuid primary key,
  name text not null unique,
  region text not null,
  created_at timestamptz not null default now()
);

create table if not exists vessels (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  imo_number text,
  name text not null,
  flag_state text,
  class_society text,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

-- Identity & RBAC
create table if not exists users (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text,
  username text,
  display_name text,
  pin_hash text,
  password_hash text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, email),
  unique (tenant_id, username)
);

create table if not exists roles (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table if not exists permissions (
  id text primary key -- slug
);

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id text not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists user_roles (
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

-- Sessions
create table if not exists sessions (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  device_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

-- Audit Events (append-only)
create table if not exists audit_events (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  vessel_id uuid references vessels(id) on delete set null,
  actor_user_id uuid references users(id) on delete set null,
  action text not null,
  subject_type text,
  subject_id text,
  before jsonb,
  after jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_tenant_created_idx on audit_events(tenant_id, created_at desc);

-- Telemetry (optional)
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

-- Hash links for future sealing
create table if not exists hash_links (
  id uuid primary key,
  stream text not null,
  seq bigint not null,
  hash text not null,
  prev_hash text,
  created_at timestamptz not null default now(),
  unique (stream, seq)
);

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
