SHELL := /bin/bash

.PHONY: up down reset build api-logs db-logs logs quickstart seed-oceanic

up:
	cd $(CURDIR) && docker compose up -d

down:
	cd $(CURDIR) && docker compose down

reset:
	cd $(CURDIR) && docker compose down -v && docker compose up -d

build:
	cd $(CURDIR) && docker compose build api

api-logs:
	docker logs -f sms_edge_api

db-logs:
	docker logs -f sms_edge_db

logs: api-logs

quickstart:
	@echo "Requesting dev quickstart token...";
	@curl -s -X POST http://localhost:8081/demo/quickstart -H 'Content-Type: application/json' | tee /tmp/edge_quickstart.json; \
	TOKEN=$$(jq -r .token /tmp/edge_quickstart.json); \
	echo; echo "Token: $$TOKEN"; \
	echo "Try: curl http://localhost:8081/me -H 'Authorization: Bearer $$TOKEN'";

seed-oceanic:
	@echo "Seeding second tenant: Oceanic Logistics";
	@docker exec -i sms_edge_db psql -U $${POSTGRES_USER:-sms} -d $${POSTGRES_DB:-sms_edge} -f /dev/stdin < scripts/seed_oceanic.sql
	@echo "Done. View tenants at: http://localhost:8081/tenants"
