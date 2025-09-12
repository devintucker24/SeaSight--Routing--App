# Edge Dev Stack (Shipboard) – Quick Start

This directory contains a Docker-based dev stack for the shipboard edge database.

## Prereqs
- Docker + Docker Compose
- Copy `.env.example` to `.env` and adjust if needed.

## Start
```
cd apps/edge
cp .env.example .env
docker compose up -d
```
Postgres will initialize with the DDL and demo seed data from `db/init` on first run.

## Services
- Postgres 15 at `localhost:5432` (db: `sms_edge`, user: `sms`, password from `.env`)
- Adminer at http://localhost:8080 (Server: `db`, System: PostgreSQL)
- Edge API at http://localhost:8081 (HTML landing page at `/`)

## Schema & Seeds
- DDL: `db/migrations/001_init.sql`
- Seeds: `db/seeds/000_demo.sql`
- Init copies (executed on first run): `db/init/001_init.sql`, `db/init/100_seed_demo.sql`

If you change migrations, re-seed by removing the named volume or running against the DB manually.

## Easy Testing

Quickstart (dev mode):
```
cd apps/edge
make build && make up
make quickstart
# Then:
curl http://localhost:8081/me -H "Authorization: Bearer $(jq -r .token /tmp/edge_quickstart.json)"
```

Scripted flow:
```
cd apps/edge
./scripts/test-auth.sh
```

Manual curl:
1. List tenants: `curl http://localhost:8081/tenants`
2. Set PIN: `curl -X POST http://localhost:8081/auth/set-pin -H 'Content-Type: application/json' -d '{"tenantId":"<ID>","username":"admin","pin":"1234"}'`
3. Login: `curl -s -X POST http://localhost:8081/auth/login -H 'Content-Type: application/json' -d '{"tenantId":"<ID>","username":"admin","pin":"1234"}'`
4. /me: `curl http://localhost:8081/me -H 'Authorization: Bearer <TOKEN>'`

