# Identity & RBAC Schemas

This document defines foundational interfaces and database schemas for tenants, vessels, users, roles, permissions, sessions, and audit events.

## TypeScript Interfaces (reference)
```ts
// IDs
type TenantID = string; // uuid
type VesselID = string; // uuid
type UserID = string;   // uuid
type RoleID = string;   // uuid
type PermissionID = string; // slug e.g., "logbook.create"

// Core
interface Tenant {
  id: TenantID;
  name: string;
  region: string; // e.g., eu-central-1, us-east-1
  createdAt: string; // ISO timestamp
}

interface Vessel {
  id: VesselID;
  tenantId: TenantID;
  imoNumber?: string;
  name: string;
  flagState?: string;
  classSociety?: string; // ABS, DNV, LR, etc.
  createdAt: string;
}

interface User {
  id: UserID;
  tenantId: TenantID;
  email?: string;
  username?: string;
  displayName?: string;
  pinHash?: string; // onboard PIN auth (argon2/bcrypt)
  passwordHash?: string; // optional for dev/admin
  isActive: boolean;
  createdAt: string;
}

interface Role {
  id: RoleID;
  tenantId: TenantID; // roles can be tenant-scoped
  slug: string; // "author", "reviewer", "admin", "auditor"
  name: string;
  description?: string;
}

type Permission =
  | "logbook.create"
  | "logbook.review"
  | "logbook.export"
  | "pms.manage"
  | "inventory.manage"
  | "requisition.approve"
  | "checklist.run"
  | "config.admin"
  | "audit.read"
  | "user.manage";

interface Session {
  id: string; // uuid
  userId: UserID;
  deviceId?: string;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
}

interface AuditEvent {
  id: string; // uuid
  tenantId: TenantID;
  vesselId?: VesselID;
  actorUserId?: UserID;
  action: string; // e.g., "auth.login", "config.activate"
  subjectType?: string; // e.g., "User", "LogbookEntry"
  subjectId?: string;
  before?: unknown; // redacted in storage where needed
  after?: unknown;  // redacted in storage where needed
  ip?: string;
  userAgent?: string;
  createdAt: string;
}
```

## PostgreSQL DDL (edge + cloud)
```sql
-- Tenancy
create table tenants (
  id uuid primary key,
  name text not null,
  region text not null,
  created_at timestamptz not null default now()
);

create table vessels (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  imo_number text,
  name text not null,
  flag_state text,
  class_society text,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

-- Identity
create table users (
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

create table roles (
  id uuid primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table permissions (
  id text primary key -- slug
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id text not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table user_roles (
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

-- Sessions
create table sessions (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  device_id text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

-- Audit Events (append-only)
create table audit_events (
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

create index audit_events_tenant_created_idx on audit_events(tenant_id, created_at desc);
```

## Seed Role/Permission Matrix (example)
```ts
const defaultPermissions: Permission[] = [
  "logbook.create", "logbook.review", "logbook.export",
  "pms.manage", "inventory.manage", "requisition.approve",
  "checklist.run", "config.admin", "audit.read", "user.manage",
];

const roleMatrix = {
  author: ["logbook.create", "checklist.run"],
  reviewer: ["logbook.review", "requisition.approve"],
  auditor: ["logbook.export", "audit.read"],
  admin: defaultPermissions,
};
```

