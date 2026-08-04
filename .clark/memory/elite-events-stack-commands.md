---
name: elite-events stack & commands
description: Project: elite-events (high-end event management: reservations, tickets, QR check-in).
saved: 2026-08-03
source: inferred
type: project
---

Project: elite-events (high-end event management: reservations, tickets, QR check-in).

Stack (verified from repo):
- backend/: Express 5 + TypeScript, raw SQL via node-postgres (no ORM), node-pg-migrate. Env from backend/.env (DATABASE_URL=postgres://elite_events:***@localhost:5433/elite_events — note port 5433, host must be 127.0.0.1 for psql from sandbox).
- frontend/: Angular 18 standalone components w/ signals, lazy routes, i18next (en/fr). apiUrl http://192.168.1.76:4000.

Commands:
- Backend: npm run dev (port 4000), npm run migrate:up|down, npx tsc --noEmit, npx jest (needs TMPDIR set to a writable dir like $PWD/.tmp-jest when sandbox TMPDIR is stale).
- Frontend: npm start (4200), ng build.

DB is a live Docker container `elite-events-db` (postgres:16-alpine) exposing 5433.

Docs/spec live in frontend/public/Events/ (capital E): project1_updated.md, walkthrough.md, DESIGN.md, Elite_Events_Specification.pdf.
