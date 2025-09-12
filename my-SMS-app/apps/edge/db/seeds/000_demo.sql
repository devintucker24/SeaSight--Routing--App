-- Demo seed data with idempotent inserts
-- Requires: 001_init.sql

-- Permissions
insert into permissions (id) values
  ('logbook.create'), ('logbook.review'), ('logbook.export'),
  ('pms.manage'), ('inventory.manage'), ('requisition.approve'),
  ('checklist.run'), ('config.admin'), ('audit.read'), ('user.manage')
on conflict do nothing;

-- Tenant
with upsert as (
  insert into tenants (id, name, region)
  values (gen_random_uuid(), 'Demo Shipping', 'eu-central-1')
  on conflict (name) do nothing
  returning id
)
select * from upsert;

-- Resolve tenant id
\set tenant_id ''
select id into temp table _t from tenants where name = 'Demo Shipping' limit 1;
\gset

-- Vessel
with upsert as (
  insert into vessels (id, tenant_id, imo_number, name, flag_state, class_society)
  values (gen_random_uuid(), :'tenant_id', '9999999', 'MV Pioneer', 'US', 'ABS')
  on conflict (tenant_id, name) do nothing
  returning id
)
select * from upsert;

-- Roles
with base as (
  select :'tenant_id'::uuid as tenant_id
), r as (
  insert into roles (id, tenant_id, slug, name)
  select gen_random_uuid(), tenant_id, slug, initcap(slug)
  from base, (values ('author'), ('reviewer'), ('auditor'), ('admin')) as v(slug)
  on conflict (tenant_id, slug) do nothing
  returning id, slug
)
select * from r;

-- Map role permissions
-- Admin gets all
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r
join permissions p on true
where r.tenant_id = :'tenant_id'::uuid and r.slug = 'admin'
on conflict do nothing;

-- Author
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r
join permissions p on p.id in ('logbook.create','checklist.run')
where r.tenant_id = :'tenant_id'::uuid and r.slug = 'author'
on conflict do nothing;

-- Reviewer
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r
join permissions p on p.id in ('logbook.review','requisition.approve')
where r.tenant_id = :'tenant_id'::uuid and r.slug = 'reviewer'
on conflict do nothing;

-- Auditor
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r
join permissions p on p.id in ('logbook.export','audit.read')
where r.tenant_id = :'tenant_id'::uuid and r.slug = 'auditor'
on conflict do nothing;

-- Users
with u as (
  select :'tenant_id'::uuid as tenant_id
), ins as (
  insert into users (id, tenant_id, email, username, display_name)
  select gen_random_uuid(), tenant_id, email, username, display_name
  from u, (values
    ('admin@example.test','admin','Admin User'),
    ('author@example.test','author','Author User'),
    ('reviewer@example.test','reviewer','Reviewer User'),
    ('auditor@example.test','auditor','Auditor User')
  ) as v(email, username, display_name)
  on conflict (tenant_id, email) do nothing
  returning id, email
)
select * from ins;

-- Resolve user ids
create temp table _uids as
select email, id from users where tenant_id = :'tenant_id'::uuid and email in (
  'admin@example.test','author@example.test','reviewer@example.test','auditor@example.test'
);

-- Assign roles to users
insert into user_roles (user_id, role_id)
select u.id, r.id
from _uids u
join roles r on r.tenant_id = :'tenant_id'::uuid and (
  (u.email = 'admin@example.test' and r.slug = 'admin') or
  (u.email = 'author@example.test' and r.slug = 'author') or
  (u.email = 'reviewer@example.test' and r.slug = 'reviewer') or
  (u.email = 'auditor@example.test' and r.slug = 'auditor')
)
on conflict do nothing;

-- Bootstrap audit event
insert into audit_events (id, tenant_id, action, subject_type, subject_id, after)
select gen_random_uuid(), :'tenant_id'::uuid, 'system.bootstrap', 'Tenant', :'tenant_id', jsonb_build_object('name','Demo Shipping')
on conflict do nothing;

