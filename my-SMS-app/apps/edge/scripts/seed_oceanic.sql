-- Seed a second tenant: Oceanic Logistics (idempotent)

-- Ensure core permissions exist (idempotent)
insert into permissions (id) values
  ('logbook.create'), ('logbook.review'), ('logbook.export'),
  ('pms.manage'), ('inventory.manage'), ('requisition.approve'),
  ('checklist.run'), ('config.admin'), ('audit.read'), ('user.manage')
on conflict do nothing;

insert into tenants (id, name, region)
values (gen_random_uuid(), 'Oceanic Logistics', 'us-east-1')
on conflict (name) do nothing;

with upsert as (
  insert into vessels (id, tenant_id, imo_number, name, flag_state, class_society)
  values (gen_random_uuid(), (select id from tenants where name = 'Oceanic Logistics' limit 1), '8888888', 'MV Horizon', 'UK', 'DNV')
  on conflict (tenant_id, name) do nothing
  returning id
)
select * from upsert;

with base as (
  select (select id from tenants where name = 'Oceanic Logistics' limit 1) as tenant_id
), r as (
  insert into roles (id, tenant_id, slug, name)
  select gen_random_uuid(), tenant_id, slug, initcap(slug)
  from base, (values ('author'), ('reviewer'), ('auditor'), ('admin')) as v(slug)
  on conflict (tenant_id, slug) do nothing
  returning id, slug
)
select * from r;

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r
join permissions p on true
where r.tenant_id = (select id from tenants where name = 'Oceanic Logistics' limit 1) and r.slug = 'admin'
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r
join permissions p on p.id in ('logbook.create','checklist.run')
where r.tenant_id = (select id from tenants where name = 'Oceanic Logistics' limit 1) and r.slug = 'author'
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r
join permissions p on p.id in ('logbook.review','requisition.approve')
where r.tenant_id = (select id from tenants where name = 'Oceanic Logistics' limit 1) and r.slug = 'reviewer'
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r
join permissions p on p.id in ('logbook.export','audit.read')
where r.tenant_id = (select id from tenants where name = 'Oceanic Logistics' limit 1) and r.slug = 'auditor'
on conflict do nothing;

with u as (
  select (select id from tenants where name = 'Oceanic Logistics' limit 1) as tenant_id
), ins as (
  insert into users (id, tenant_id, email, username, display_name)
  select gen_random_uuid(), tenant_id, email, username, display_name
  from u, (values
    ('admin+oceanic@example.test','o-admin','Oceanic Admin'),
    ('author+oceanic@example.test','o-author','Oceanic Author'),
    ('reviewer+oceanic@example.test','o-reviewer','Oceanic Reviewer'),
    ('auditor+oceanic@example.test','o-auditor','Oceanic Auditor')
  ) as v(email, username, display_name)
  on conflict (tenant_id, email) do nothing
  returning id, email
)
select * from ins;

create temp table _uids2 as
select email, id from users where tenant_id = (select id from tenants where name = 'Oceanic Logistics' limit 1) and email in (
  'admin+oceanic@example.test','author+oceanic@example.test','reviewer+oceanic@example.test','auditor+oceanic@example.test'
);

insert into user_roles (user_id, role_id)
select u.id, r.id
from _uids2 u
join roles r on r.tenant_id = (select id from tenants where name = 'Oceanic Logistics' limit 1) and (
  (u.email = 'admin+oceanic@example.test' and r.slug = 'admin') or
  (u.email = 'author+oceanic@example.test' and r.slug = 'author') or
  (u.email = 'reviewer+oceanic@example.test' and r.slug = 'reviewer') or
  (u.email = 'auditor+oceanic@example.test' and r.slug = 'auditor')
)
on conflict do nothing;

insert into audit_events (id, tenant_id, action, subject_type, subject_id, after)
select gen_random_uuid(), (select id from tenants where name = 'Oceanic Logistics' limit 1), 'system.bootstrap', 'Tenant', (select id from tenants where name = 'Oceanic Logistics' limit 1), jsonb_build_object('name','Oceanic Logistics')
on conflict do nothing;

