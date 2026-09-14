# Futon — Memory (Progress Tracker)

> **Purpose:** This file is the single source of truth for build progress.  
> At the start of every session, read this file first to know exactly where we left off.  
> After completing a task, mark it `[x]` here immediately — before moving to the next task.

---

## Quick Status

| Metric | Value |
|---|---|
| **Last Updated** | 2026-09-14 |
| **Current Phase** | Phase 1: Foundation |
| **Current Task** | 1.4 Redis & Background Jobs / 1.5 Error Handling |
| **Total Tasks** | 91 |
| **Completed** | 28 / 91 |
| **Progress** | 31% |

### Phase Progress

| Phase | Tasks | Done | Status |
|---|---|---|---|
| Phase 1: Foundation | 37 | 28 | 🟡 In progress |
| Phase 2: Workspace Core | 30 | 0 | ⬜ Not started |
| Phase 3: Billing | 14 | 0 | ⬜ Not started |
| Phase 4: Hardening | 18 | 0 | ⬜ Not started |
| Phase 5: Launch Readiness | 17 | 0 | ⬜ Not started |

> **Status legend:** ⬜ Not started · 🟡 In progress · ✅ Complete

---

## Notes & Decisions Log

> Record any important decisions, deviations from the plan, or blockers here as they arise.

| Date | Note |
|---|---|
| 2026-09-13 | Project initialized. Implementation plan created and approved. |
| 2026-09-13 | Section 1.0 completed: Git repo initialized, client/server workspace configured, CI/Dependabot, Prettier, jsconfig, base Express & Vite apps verified with passing tests. Pushed to GitHub. |
| 2026-09-13 | Prisma installed (`@prisma/client` + `prisma`), schema defined (`Company`, `User`, `Membership`, `Invitation`, `AuditLog`), indexes added, RLS SQL policies created. Scoped query helper and Pino tenant logger configured. Auth Zod schemas & validator implemented. Paused for break. Next up: DB connection/migration & Auth route endpoints. |
| 2026-09-14 | Section 1.1 completed: Neon PostgreSQL connected with connection pooling & direct URL configuration. Prisma CLI synced to stable 6.4.1. Schema pushed to Neon (`companies`, `users`, `memberships`, `invitations`, `audit_logs`). All PostgreSQL RLS policies applied and table connectivity verified. |
| 2026-09-14 | Sections 1.2 & 1.3 completed: Bcrypt password hashing and JWT token utilities implemented. Auth routes & services for signup, login, refresh, logout, password reset, and email verification built and mounted. Tenant scoping middlewares (`authenticateToken`, `attachCompanyContext`, `requireRole`) implemented. 16 integration and health tests passing against live database. ESLint 9 configured and passing cleanly. |

---

## Phase 1: Foundation (28 / 37)

**Goal:** Repo, tooling, database, ORM, auth, tenant-scoping middleware.

### 1.0 — Repository & Environment
- [x] **1.0.1** Init Git repo, `.gitignore`, `README.md`, license
- [x] **1.0.2** Create `server/` + `client/` directory structure
- [x] **1.0.3** Init `server/package.json` with Express, dotenv, cors, helmet
- [x] **1.0.4** Init `client/` with Vite React (plain JS)
- [x] **1.0.5** Create `.env.example` files for server and client
- [x] **1.0.6** Set up ESLint + Prettier + `@ts-check` / JSDoc
- [x] **1.0.7** Basic GitHub Actions CI workflow (install → lint → test)
- [x] **1.0.8** Add Dependabot / Snyk for dependency scanning

### 1.1 — Database Setup
- [x] **1.1.1** Provision free-tier managed PostgreSQL (Neon / Supabase)
- [x] **1.1.2** Install Prisma + `@prisma/client`, run `prisma init`
- [x] **1.1.3** Define Prisma schema (Company, User, Membership, Invitation, AuditLog)
- [x] **1.1.4** Run initial migration, verify tables
- [x] **1.1.5** Add database indexes on key columns
- [x] **1.1.6** Create RLS policies on tenant-scoped tables

### 1.2 — Authentication
- [x] **1.2.1** Install auth deps (bcryptjs, jsonwebtoken, zod)
- [x] **1.2.2** Create Zod schemas for auth requests
- [x] **1.2.3** `POST /api/auth/signup` (user + company + membership + JWT)
- [x] **1.2.4** `POST /api/auth/login`
- [x] **1.2.5** `POST /api/auth/refresh`
- [x] **1.2.6** `POST /api/auth/logout` (refresh token invalidation)
- [x] **1.2.7** Email verification flow (`POST /api/auth/verify-email`)
- [x] **1.2.8** Password reset flow (forgot + reset endpoints)

### 1.3 — Tenant-Scoping Middleware
- [x] **1.3.1** `authenticateToken` middleware (JWT verify → `req.user`)
- [x] **1.3.2** `requireRole(...roles)` middleware factory
- [x] **1.3.3** `scopedQuery(companyId)` tenant-scoping utility
- [x] **1.3.4** Prisma extension to `SET LOCAL app.current_company_id` for RLS
- [x] **1.3.5** `attachCompanyContext` middleware (validate membership + populate `req.company`)
- [x] **1.3.6** Structured JSON logging with `companyId` + `requestId`

### 1.4 — Redis & Background Jobs
- [ ] **1.4.1** Provision Upstash Redis, install ioredis + bullmq
- [ ] **1.4.2** Redis client module (`server/src/lib/redis.js`)
- [ ] **1.4.3** BullMQ queue manager + workers (email, stripe-webhooks, audit-log)
- [ ] **1.4.4** Refresh-token blacklist via Redis

### 1.5 — Error Handling & Monitoring
- [ ] **1.5.1** Global Express error-handling middleware
- [ ] **1.5.2** Sentry setup — server (`@sentry/node`)
- [ ] **1.5.3** Sentry setup — client (`@sentry/react`)

### 1.6 — Seed Data & Smoke Test
- [ ] **1.6.1** `prisma/seed.js` — two companies, three users, audit log entries
- [ ] **1.6.2** Smoke test: signup → login → protected route → 401 on unauthed

---

## Phase 2: Workspace Core (0 / 30)

**Goal:** Company management, invitations, roles, workspace switching, email, audit log, full frontend.

### 2.1 — Company Management API
- [ ] **2.1.1** `GET /api/companies/current`
- [ ] **2.1.2** `PATCH /api/companies/current` (update profile)
- [ ] **2.1.3** `DELETE /api/companies/current` (soft-delete, Owner-only)
- [ ] **2.1.4** `POST /api/companies/switch` (switch active workspace)

### 2.2 — Invitation Flow
- [ ] **2.2.1** `POST /api/invitations` (create + queue email)
- [ ] **2.2.2** `GET /api/invitations` (list pending)
- [ ] **2.2.3** `DELETE /api/invitations/:id` (revoke)
- [ ] **2.2.4** `POST /api/invitations/:token/accept`
- [ ] **2.2.5** `POST /api/invitations/:id/resend`

### 2.3 — Member Management API
- [ ] **2.3.1** `GET /api/members`
- [ ] **2.3.2** `PATCH /api/members/:membershipId/role`
- [ ] **2.3.3** `DELETE /api/members/:membershipId` (remove member)
- [ ] **2.3.4** `POST /api/members/leave`
- [ ] **2.3.5** `POST /api/members/:membershipId/transfer-ownership`

### 2.4 — Email Service
- [ ] **2.4.1** Resend setup + API key
- [ ] **2.4.2** Email service module (invite, welcome, password reset, verify)
- [ ] **2.4.3** Wire BullMQ email worker

### 2.5 — Audit Logging
- [ ] **2.5.1** `logAudit()` utility + BullMQ worker
- [ ] **2.5.2** Retrofit all Phase 2 endpoints with audit logging
- [ ] **2.5.3** `GET /api/audit-log` (paginated, Owner/Admin)

### 2.6 — Frontend Foundation
- [ ] **2.6.1** Install frontend deps (router, react-query, zustand, forms, zod)
- [ ] **2.6.2** Tailwind CSS v4 + shadcn/ui + design tokens
- [ ] **2.6.3** React Router config (public + protected routes)
- [ ] **2.6.4** Layout shell (sidebar nav + top bar + workspace switcher)
- [ ] **2.6.5** API client (Axios/fetch with auth interceptor)
- [ ] **2.6.6** Zustand store (activeCompany, user)
- [ ] **2.6.7** TanStack Query provider + config

### 2.7 — Auth UI
- [ ] **2.7.1** Signup page
- [ ] **2.7.2** Login page
- [ ] **2.7.3** Forgot / Reset Password pages
- [ ] **2.7.4** Email Verification page

### 2.8 — Workspace UI
- [ ] **2.8.1** Dashboard (card-based summary modules)
- [ ] **2.8.2** Members page (table + role management)
- [ ] **2.8.3** Invite Member modal
- [ ] **2.8.4** Pending Invitations list
- [ ] **2.8.5** Accept Invite page
- [ ] **2.8.6** Company Settings page (+ danger zone)
- [ ] **2.8.7** Workspace Switcher dropdown
- [ ] **2.8.8** Empty states (benefit-led copy + CTA)

---

## Phase 3: Billing (0 / 14)

**Goal:** Stripe integration — checkout, portal, webhooks, plan gating.

### 3.1 — Stripe Setup
- [ ] **3.1.1** Stripe account + test-mode keys
- [ ] **3.1.2** Create Products/Prices (Free, Pro, Enterprise)

### 3.2 — Stripe Backend
- [ ] **3.2.1** Install `stripe`, create client module
- [ ] **3.2.2** `POST /api/billing/checkout-session` (Owner-only)
- [ ] **3.2.3** `POST /api/billing/portal-session` (Owner-only)
- [ ] **3.2.4** `GET /api/billing` (plan, status, invoices)
- [ ] **3.2.5** `POST /api/webhooks/stripe` (signature verify + enqueue)
- [ ] **3.2.6** Stripe event idempotency store
- [ ] **3.2.7** Webhook event handlers (checkout, subscription, invoice events)

### 3.3 — Plan Gating
- [ ] **3.3.1** Plan limits config (max members per tier)
- [ ] **3.3.2** `checkPlanLimit` middleware
- [ ] **3.3.3** `requireActiveSubscription` middleware (read-only grace)
- [ ] **3.3.4** Wire gating into invitation + write endpoints

### 3.4 — Billing UI
- [ ] **3.4.1** Billing / Plans page (plan comparison + Checkout/Portal CTAs)
- [ ] **3.4.2** Billing history section
- [ ] **3.4.3** Upgrade prompts + plan-gate banners
- [ ] **3.4.4** Payment failure + renewal reminder emails

---

## Phase 4: Hardening (0 / 18)

**Goal:** Security, RLS verification, isolation test suite, rate limiting, caching, comprehensive tests, monitoring.

### 4.1 — RLS Verification
- [ ] **4.1.1** Integration tests: cross-tenant CRUD blocked by RLS
- [ ] **4.1.2** Verify Prisma middleware sets `app.current_company_id`

### 4.2 — Multi-Tenancy Isolation Test Suite
- [ ] **4.2.1** Dedicated isolation test suite (JWT spoofing, ID tampering, etc.)
- [ ] **4.2.2** Add isolation suite to CI

### 4.3 — Rate Limiting
- [ ] **4.3.1** Redis-backed rate limiting (auth, invite-token, general API)
- [ ] **4.3.2** 429 responses with `Retry-After` header

### 4.4 — Caching
- [ ] **4.4.1** Cache tenant metadata (plan, status) in Redis
- [ ] **4.4.2** Wire `requireActiveSubscription` to cache

### 4.5 — Comprehensive Testing
- [ ] **4.5.1** Unit tests (role checks, scoped queries, plan limits, audit)
- [ ] **4.5.2** Integration tests (auth flow, invite flow, role changes, billing)
- [ ] **4.5.3** E2E tests — Playwright (signup → invite → subscribe → switch)

### 4.6 — Scheduled Jobs
- [ ] **4.6.1** Purge soft-deleted companies (past 30-day grace)
- [ ] **4.6.2** Clean up expired invitations
- [ ] **4.6.3** Subscription renewal reminder job

### 4.7 — Monitoring & Alerting
- [ ] **4.7.1** UptimeRobot health checks
- [ ] **4.7.2** `GET /api/health` endpoint (Postgres + Redis check)
- [ ] **4.7.3** Audit all logs for `companyId` + `requestId` tags

### 4.8 — Security Hardening
- [ ] **4.8.1** Helmet.js CSP + HSTS config
- [ ] **4.8.2** Authorization audit (all endpoints)
- [ ] **4.8.3** Stripe webhook signature verification check
- [ ] **4.8.4** CORS configuration review

---

## Phase 5: Launch Readiness (0 / 17)

**Goal:** Polish, accessibility, staging, docs, production deploy.

### 5.1 — UI Polish & Accessibility
- [ ] **5.1.1** Responsive design (mobile layouts, collapsible sidebar)
- [ ] **5.1.2** "Skip to main content" link
- [ ] **5.1.3** Keyboard nav, focus indicators, ARIA labels
- [ ] **5.1.4** Role-adaptive onboarding (Owner vs Member)
- [ ] **5.1.5** Micro-animations / transitions
- [ ] **5.1.6** Trust / Security page

### 5.2 — Staging Environment
- [ ] **5.2.1** Deploy staging (separate DB, Redis, Stripe test, Sentry)
- [ ] **5.2.2** Auto-deploy `main` to staging via GitHub Actions
- [ ] **5.2.3** Run isolation tests against staging

### 5.3 — Documentation
- [ ] **5.3.1** API docs (Swagger / OpenAPI)
- [ ] **5.3.2** Database Schema Reference
- [ ] **5.3.3** User-facing Help / Docs
- [ ] **5.3.4** Internal operational playbooks

### 5.4 — Production Deployment
- [ ] **5.4.1** Deploy backend (Render / Railway / Fly.io)
- [ ] **5.4.2** Deploy frontend (Vercel / Netlify)
- [ ] **5.4.3** Custom domain + HTTPS + HSTS
- [ ] **5.4.4** Stripe live-mode keys + live Products/Prices
- [ ] **5.4.5** Run full test suite against production
- [ ] **5.4.6** Manual walkthrough of complete user journey
