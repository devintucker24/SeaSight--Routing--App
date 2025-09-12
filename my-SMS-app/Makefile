SHELL := /bin/bash

.PHONY: help dev up down reset web backend logs-backend logs-api logs-db open-urls

help:
	@echo "Available targets:"
	@echo "  make dev          # Rebuild API + start backend, then start web dev server"
	@echo "  make up           # Rebuild API and start backend only (Docker)"
	@echo "  make down         # Stop backend (Docker)"
	@echo "  make reset        # Stop and remove backend volumes, then start fresh"
	@echo "  make web          # Install deps and start web dev server"
	@echo "  make logs-api     # Tail API logs"
	@echo "  make logs-db      # Tail DB logs"

# One-click: rebuild API and start everything. Web dev server will stay running in this terminal.
dev: up open-urls web

# Backend only: rebuild API image and start Docker Compose (db + adminer + api)
up:
	cd apps/edge && docker compose build api && docker compose up -d
	@echo "Backend up. API: http://localhost:8081  Adminer: http://localhost:8080"

down:
	cd apps/edge && docker compose down

reset:
	cd apps/edge && docker compose down -v && docker compose up -d
	@echo "Backend reset complete."

# Web app dev server
web:
	cd apps/web && npm install && npm run dev

logs-backend: logs-api

logs-api:
	docker logs -f sms_edge_api

logs-db:
	docker logs -f sms_edge_db

# Attempt to open useful URLs in the default browser (macOS 'open' or Linux 'xdg-open')
open-urls:
	@echo "Opening Web, API, and Adminer in your browser (if supported)..."
	@if command -v open >/dev/null 2>&1; then \
	  open http://localhost:5173 && \
	  open http://localhost:8081 && \
	  open http://localhost:8081/docs && \
	  open http://localhost:8080 ; \
	elif command -v xdg-open >/dev/null 2>&1; then \
	  xdg-open http://localhost:5173 >/dev/null 2>&1 || true; \
	  xdg-open http://localhost:8081 >/dev/null 2>&1 || true; \
	  xdg-open http://localhost:8081/docs >/dev/null 2>&1 || true; \
	  xdg-open http://localhost:8080 >/dev/null 2>&1 || true; \
	else \
	  echo "Could not find 'open' or 'xdg-open'. Please open these URLs manually:"; \
	  echo "  Web:   http://localhost:5173"; \
	  echo "  API:   http://localhost:8081"; \
	  echo "  Docs:  http://localhost:8081/docs"; \
	  echo "  DB:    http://localhost:8080"; \
	fi
