# Elite Events

Event reservation, ticketing, and QR code check-in system.

## Structure

```
elite-events/
├── backend/    Express + TypeScript API (raw SQL via node-postgres, no ORM)
└── frontend/   Angular 18 (standalone components)
```

## Backend — Getting Started

### 1. Start PostgreSQL via Docker

```bash
cd backend
docker compose up -d
```

This starts Postgres 16 on `localhost:5432` with credentials matching `.env.example`
(database `elite_events`, user `elite_events`). Data persists in a Docker volume
across restarts.

### 2. Configure environment

```bash
cp .env.example .env   # then fill in real values (JWT secret, SMTP, admin creds)
```

### 3. Install dependencies and run migrations

```bash
npm install
npm run migrate:up
```

This creates all tables (`buildings`, `rooms`, `tables`, `chairs`, `events`,
`invitees`, `reservations`, `tickets`, `users`, `gate_staff_assignments`) plus
the enums (`role_type`, `reservation_status`, `ticket_status`).

**Important constraint to know about:** `reservations` has a partial unique
index (`event_id, chair_id` where `status = 'ACTIVE'`) — this means the
database itself rejects double-booking a chair for the same event, even
under concurrent requests. This is stronger than an application-level check
alone and was tested directly against Postgres.

### 4. Run the server

```bash
npm run dev   # starts on http://localhost:4000
```

### Migration commands

```bash
npm run migrate:up      # apply all pending migrations
npm run migrate:down    # roll back the most recent migration
```

To add a new migration, create a new timestamped file in `migrations/`
following the pattern in `migrations/1783756785000_init-schema.js`
(the `node-pg-migrate create` CLI has a config-loading bug on newer Node
versions — writing the file by hand works fine and is what the initial
migration does).

### Implemented so far
- `POST /auth/login` — role-branching login (Admin username → OTP required, anything else → Gate Staff, direct token)
- `POST /auth/verify-otp` — Admin OTP verification, issues JWT
- `GET/POST /gate-staff`, `DELETE /gate-staff/:id` — Admin-only Gate Staff account management (create, list, soft-delete)
- `POST /gate-staff/:id/assignments/:eventId` — assign a Gate Staff member to an event
- `GET /health` — health check
- Auth middleware (`requireAuth`, `requireRole`) enforcing role-based access at the API level — verified: a Gate Staff token correctly gets a 403 when hitting an Admin-only route
- Rate limiting on login/OTP endpoints
- Raw SQL query helper + transaction helper in `src/config/db.ts`
- Placeholder route files for rooms, events, reservations, tickets (ready for query implementation)

### Not yet implemented (next steps)
- Room/Event/Reservation/Ticket business logic (routes are stubbed)
- QR code + PDF ticket generation
- Automated tests (Jest + Supertest scaffolding is installed, no tests written yet)

## Frontend — Getting Started

```bash
cd frontend
npm install
npm start   # starts on http://localhost:4200
```

### Implemented so far
- Login screen (wired to `/auth/login`)
- OTP verification screen (wired to `/auth/verify-otp`, 8-digit segmented input)
- Route guards: `authGuard` (any authenticated user), `adminOnlyGuard` (Admin only — Gate Staff gets redirected to `/scanner`)
- HTTP interceptor attaching the JWT to all outgoing requests
- Global design tokens in `src/styles.scss`, matching `DESIGN.md` (burgundy/peach palette, typography scale, spacing, elevation)
- Placeholder components for Dashboard, Venues, Events, Guest List, Scanner (routed, lazy-loaded, ready to build out)

### Not yet implemented (next steps)
- Real Dashboard/Venues/Events/Guest List/Scanner UI (currently placeholders)
- API services for rooms/events/reservations/tickets
- QR scanner integration (camera access)

## Notes

- **No ORM, no hosted third-party DB.** Postgres runs in your own Docker container; all queries are raw SQL via the `pg` driver, with `node-pg-migrate` tracking schema history in plain migration files — nothing here depends on an external platform.
- **Auth model:** Admin credentials are hardcoded in `backend/.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`). Gate Staff accounts live in the real `users` table and are created via the Admin-only `/gate-staff` endpoints.
- **Email (OTP):** requires a real SMTP relay (e.g. Brevo) with a *verified sender* and the SMTP-specific key (not your account password) — see chat history for the exact steps if you hit a `535` or silent-delivery issue.
- **Security reminder:** Angular route guards are UX convenience only. The Express `requireRole` middleware is the actual enforcement boundary — this was tested directly (Gate Staff → 403 on Admin routes).
- Full specification: see `Elite_Events_Specification.pdf` / `project1_updated.md` (provided separately in chat).
