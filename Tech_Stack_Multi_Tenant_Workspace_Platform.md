# Technology Stack Document
## Multi-Tenant Workspace Platform

| | |
|---|---|
| **Prepared by** | Senior CTO Advisory (Hiring Platforms & Marketplaces background) |
| **Status** | Draft v1.0 |
| **Last Updated** | September 13, 2026 |
| **Related Docs** | PRD — Multi-Tenant Workspace Platform, UI/UX Design Analysis |

---

## 1. Guiding Principles

Before listing technologies, it's worth stating the philosophy behind the choices — this is what I'd tell any engineering team joining the project:

1. **Boring technology wins early.** Every piece of this stack is proven at scale elsewhere. We are not here to innovate on infrastructure — we're here to innovate on the product.
2. **Optimize for one thing at a time.** At <10K tenants, the bottleneck will be product velocity, not infrastructure scale. Don't over-engineer for a scale we don't have yet.
3. **Security and isolation are non-negotiable, even at MVP.** In a multi-tenant product, a single data-leak incident can kill the company. This influences stack choices more than almost anything else.
4. **Everything must be observable from day one.** If we can't see it, we can't debug it, and in multi-tenant systems, debugging blind means guessing which tenant is affected.
5. **Managed services over self-hosted, until there's a clear cost or control reason not to.** Small team, so undifferentiated ops work is a tax we can't afford early.
6. **Free-tier infrastructure is fine for validation, not forever.** We're using free/low-cost hosting to get to first customers without burning runway on infra — but every free-tier choice below is paired with a clear upgrade path so we're not re-architecting when we outgrow it.

---

## 2. Stack Summary (At a Glance)

| Layer | Choice |
|---|---|
| Backend Framework | Node.js + Express (JavaScript) |
| Database | PostgreSQL (free-tier managed: Supabase/Neon/Render) |
| ORM | Prisma (with JSDoc typing for safety) |
| Auth | JWT-based sessions, bcrypt/argon2 password hashing |
| Cache/Queue | Redis (Upstash free tier) |
| Background Jobs | BullMQ (Redis-backed) |
| Billing | Stripe (Checkout, Billing Portal, Webhooks) |
| Frontend | React + JavaScript, Vite |
| API Style | REST (GraphQL optional later) |
| File Storage | Free-tier object storage (Cloudflare R2 / Supabase Storage) |
| Email | Free-tier transactional email (Resend free tier) |
| Hosting | Free-tier PaaS (Render free web service, Railway free tier, or Fly.io free allowance) |
| CI/CD | GitHub Actions (free for public/small private repos) |
| Monitoring | Sentry free tier + platform-native logs |
| Infra as Code | Terraform (deferred until past free-tier stage) |

---

## 3. Backend

### 3.1 Runtime & Framework — Node.js + Express (JavaScript)
- **Why:** Matches the team's existing decision, has the largest talent pool for hiring quickly, and Express remains battle-tested for REST APIs with fine-grained middleware control — important for tenant-scoping logic, which we want enforced consistently at the middleware layer.
- **On dropping TypeScript:** this is a reasonable call for speed of iteration with a small team, but it removes a safety net that specifically helps prevent cross-tenant data leaks (type-checked `company_id` propagation through every query). To compensate, I'd insist on these guardrails instead:
  - **JSDoc type annotations** on core models/functions (via `// @ts-check` in key files) — gets partial type-checking in editors without full TypeScript adoption.
  - **A single, mandatory tenant-scoping utility function** (e.g., `scopedQuery(companyId, ...)`) that every query must go through — code review should reject any direct Prisma call that bypasses it.
  - **Runtime schema validation** (Zod, used in plain JS) on all inputs, so malformed or missing `company_id` values fail loudly instead of silently.
  - **The multi-tenancy test suite (Section 9)** becomes even more important without compile-time type safety — treat it as non-negotiable, not optional coverage.

### 3.2 API Style — REST (v1)
- REST keeps the mental model simple for a small team and integrates cleanly with Stripe webhooks, invite-link flows, and standard frontend tooling.
- GraphQL can be introduced later if/when the frontend needs more flexible querying (e.g., a highly customizable admin dashboard), but it adds complexity (schema stitching, tenant-aware resolvers) that isn't justified at MVP.

### 3.3 Database — PostgreSQL (Managed)
- **Why Postgres specifically:** Native support for Row-Level Security (RLS), which is central to our tenant isolation strategy (see PRD Section 7). Strong JSON support (JSONB) for flexible metadata fields without needing a second database.
- **Why managed (e.g., AWS RDS, Neon, Supabase, or Railway Postgres):** Automated backups, point-in-time recovery, and failover are hard to get right ourselves and are exactly the kind of undifferentiated work to outsource early.
- **Isolation implementation:** every tenant-scoped table carries a `company_id` column; RLS policies enforce `company_id = current_setting('app.current_company_id')` as a backstop against application-layer bugs.

### 3.4 ORM — Prisma
- Works perfectly well in plain JavaScript — Prisma generates a query client with autocomplete in most editors even without TypeScript, so we don't lose much day-to-day developer experience.
- Prisma's middleware/extension system lets us inject `company_id` filtering automatically into every query — this becomes *more* important, not less, without TypeScript, since it's a runtime guardrail rather than a compile-time one.
- Migration tooling is solid for a small-to-mid-size schema like ours.
- *(Alternative: Drizzle ORM — lighter weight, more SQL-like. Worth evaluating if the team prefers closer-to-SQL control, but Prisma's tooling maturity wins for a team that wants to move fast.)*

### 3.5 Authentication & Authorization
- **Authentication:** JWT-based sessions (access token + refresh token pattern). Passwords hashed with bcrypt or argon2.
- **Authorization:** Role (Owner/Admin/Member) embedded in the JWT claims alongside `active_company_id`. Middleware validates both the token and the tenant context on every request.
- **Future-proofing:** Structure the auth layer so SSO/SAML (via a provider like WorkOS) can be added later without a full rewrite — common need once we move upmarket to enterprise customers.

### 3.6 Caching & Background Jobs — Redis + BullMQ
- **Redis:** session/token blacklisting, rate limiting, and caching frequently accessed tenant metadata (e.g., subscription status) to avoid hitting Postgres on every request.
- **BullMQ:** background job processing for things that shouldn't block the request/response cycle — sending invite emails, processing Stripe webhook side effects, generating audit log entries, scheduled subscription checks.

---

## 4. Frontend

### 4.1 Framework — React + JavaScript
- Largest ecosystem, easiest hiring, and integrates well with the component libraries needed for a dashboard-heavy product (tables, modals, forms).
- **Vite** as the build tool for fast local dev and lean production builds — meaningfully faster than older bundlers for day-to-day development speed, and works identically well with plain JS or TS.
- Since we're skipping TypeScript, lean on **PropTypes** or simple runtime checks for shared components, and keep component boundaries small — this makes bugs easier to spot without the compiler's help.

### 4.2 State Management
- **Server state:** TanStack Query (React Query) — handles caching, refetching, and loading/error states for API data far better than hand-rolled solutions.
- **Client/UI state:** React Context or a lightweight store (Zustand) for things like "current active company" — kept separate from server state to avoid sync bugs.

### 4.3 UI Layer
- Component library: shadcn/ui or a similar headless-component + Tailwind CSS approach — gives design flexibility without fighting a heavy opinionated framework, and pairs well with the modular, card-based UI patterns identified in the UX analysis doc.
- Tailwind CSS for styling — fast to iterate, easy to keep consistent across a small design system.

### 4.4 Forms & Validation
- React Hook Form + Zod — Zod schemas can be shared between frontend validation and backend request validation, reducing duplicated validation logic and drift between the two.

---

## 5. Billing Infrastructure — Stripe

- **Stripe Checkout** for initial subscription purchase — offloads PCI compliance entirely; no card data touches our servers.
- **Stripe Billing Portal** for self-serve plan changes, payment method updates, and cancellations — avoids building this UI ourselves.
- **Webhooks** (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`) processed asynchronously via BullMQ to keep webhook response times fast and reliable (Stripe expects quick 2xx responses).
- **Idempotency:** all webhook handlers must be idempotent — Stripe can and will retry deliveries; store processed event IDs to avoid double-processing.

---

## 6. Infrastructure & DevOps

### 6.1 Hosting — Free-Tier Stage

Since the priority right now is validating the product without burning cash, here's a stack that can run entirely on free tiers:

| Component | Free-Tier Option | Notes / Limits to Know |
|---|---|---|
| Backend API (Node/Express) | **Render free web service** or **Railway free tier** or **Fly.io free allowance** | Render/Railway free tiers typically spin down on inactivity, causing a cold-start delay on the first request after idle — acceptable for MVP/demo, worth knowing before a sales demo |
| Database (Postgres) | **Supabase free tier** or **Neon free tier** | Both give a real managed Postgres with generous free storage (Neon ~0.5GB, Supabase ~500MB at time of writing — verify current limits before committing); Supabase also bundles auth/storage if we ever want to lean on it more |
| Redis | **Upstash free tier** | Serverless Redis, pay-per-request pricing after free allowance — good fit since our free-tier traffic will be low and bursty |
| Frontend hosting | **Vercel free tier** or **Netlify free tier** | Excellent for a React/Vite SPA, generous bandwidth on free tier, instant preview deploys per PR |
| File storage | **Cloudflare R2 free tier** (10GB storage, no egress fees) or **Supabase Storage free tier** | R2's lack of egress fees is a meaningful advantage over S3 if file downloads grow |
| Email | **Resend free tier** (~3,000 emails/month at time of writing) | Plenty for invite emails and notifications at MVP scale |
| Error tracking | **Sentry free tier** | Enough events/month for early-stage error monitoring |

**Important caveat:** exact free-tier limits (storage caps, request limits, cold-start behavior) change over time across these providers — verify current numbers before committing, since this is the kind of detail that goes stale quickly.

### 6.2 Growth Stage (Post-Free-Tier)
- Migrate backend hosting to a paid tier on the same platform first (Render/Railway paid plans are a low-friction next step — no re-architecture needed) before considering AWS.
- Move to AWS (ECS/Fargate or EKS) only once traffic, compliance needs (SOC 2, dedicated VPC), or cost crossover clearly justify the added operational complexity — common trajectory for marketplace/B2B platforms once enterprise customers start asking for these guarantees.
- Because we chose managed Postgres providers (Supabase/Neon) that support standard Postgres connection strings, migrating off them later (e.g., to AWS RDS) is a data migration, not a rewrite.

### 6.3 File Storage
- Cloudflare R2 free tier (or Supabase Storage) for any file uploads (company logos, attachments) — never store binary blobs in Postgres, even on a free tier, since it eats into the small storage allowance fast.

### 6.4 Email Delivery
- Resend free tier for invites, password resets, billing notifications — deliverability and reputation management are not worth building in-house even at MVP stage.

### 6.5 CI/CD
- **GitHub Actions** for automated testing, linting, and deployment pipelines on every PR/merge — free for public repos and includes a generous free allowance for private repos too.
- Staging environment (a second free-tier deployment) mirroring production for testing tenant-isolation logic and Stripe webhook flows before release.

### 6.6 Infrastructure as Code
- **Terraform** deferred until we move off free-tier PaaS platforms — not useful while relying on dashboard-managed services like Render/Supabase, but worth planning for before the AWS migration.

---

## 7. Observability & Monitoring

| Concern | Tool | Why |
|---|---|---|
| Error tracking | Sentry (free tier) | Best-in-class for catching and triaging exceptions across frontend + backend, with release tracking; free tier's event cap is fine for early-stage traffic |
| Metrics/logging | Hosting platform's built-in logs (Render/Railway dashboards) to start | Need to correlate logs by `company_id` to debug tenant-specific issues quickly — even basic structured logging (JSON logs with `company_id`/`request_id` fields) goes a long way before investing in a dedicated log platform |
| Uptime monitoring | UptimeRobot free tier | Simple external health checks on core auth/API endpoints, generous free monitor count |
| Audit logging | Custom (Postgres table, per PRD Section 6) | Compliance and security requirement — who did what, when, in which company |

**Non-negotiable practice:** every log line and error report must be tagged with `company_id` (where applicable) and `request_id` — this is what makes debugging a multi-tenant system tractable instead of a guessing game.

---

## 8. Security Stack

- **Transport security:** HTTPS everywhere, HSTS enabled.
- **Secrets management:** Environment variables via the hosting platform's secret manager, or a dedicated tool (Doppler, AWS Secrets Manager) — never committed to source control.
- **Rate limiting:** Redis-backed rate limiting on auth endpoints and invite-token endpoints to prevent brute-force/enumeration attacks.
- **Dependency scanning:** Automated (Dependabot/Snyk) as part of CI.
- **Row-Level Security (RLS):** Postgres RLS policies as the second line of defense against cross-tenant data leaks, on top of application-layer scoping.
- **Penetration testing:** Budget for at least one third-party pentest before any enterprise sales push — buyers will ask.

---

## 9. Testing Strategy

| Layer | Tooling | Focus |
|---|---|---|
| Unit tests | Jest (or Vitest) — plain JS, no TS config needed | Business logic, especially role-permission checks and tenant-scoping utilities |
| Integration tests | Supertest + a test Postgres instance | API endpoints, especially auth and invite flows |
| E2E tests | Playwright | Critical user journeys: signup → create company → invite member → subscribe |
| Multi-tenancy specific tests | Custom test suite | Explicitly test that Tenant A can never read/write Tenant B's data — this deserves its own dedicated, continuously-run test suite, not just incidental coverage |

---

## 10. Scaling Considerations (Post-MVP)

These aren't needed on day one, but worth planning for so early decisions don't paint us into a corner:

- **Database read replicas** once read load grows — Prisma supports read/write splitting with some configuration.
- **Connection pooling** (PgBouncer) becomes necessary well before raw Postgres connection limits become a real bottleneck.
- **Horizontal scaling of the API layer** — since sessions are JWT-based (stateless), this is straightforward; just add more container instances behind a load balancer.
- **Sharding by tenant** is a last resort, only relevant at a scale (tens of thousands of large tenants) far beyond what shared-schema + RLS can handle — not a near-term concern.

---

## 11. Team & Hiring Implications

Based on this stack, the core hires needed to execute:
- **Full-stack engineers** comfortable in JavaScript across Node/React (most flexible hires for a small team).
- **One engineer with strong Postgres/data modeling experience** early — tenant isolation correctness depends heavily on this.
- **DevOps/infra ownership** can be part-time/fractional at MVP stage given the managed-platform choices, growing into a dedicated hire around the AWS migration point.

---

## 12. Open Questions

1. Do we anticipate enterprise customers requiring dedicated infrastructure or specific compliance certifications (SOC 2, ISO 27001) within the first year? This affects how early we invest in Terraform/AWS migration.
2. Is GraphQL likely to be needed for a future public API/developer platform (similar to how Slack exposes `api.slack.com`)?
3. Do we need multi-region deployment for latency or data-residency reasons (e.g., EU customers), and if so, on what timeline?
4. What's the expected file storage volume (attachments, logos) — does this change the object storage provider choice?
5. What signup/usage volume should trigger the move off free tiers (e.g., "X paying companies" or "Y requests/day")? Worth defining this threshold now so the upgrade decision isn't made in a panic during a cold-start-related demo failure.

---

## 13. Appendix

### 13.1 Related Documents
- Product Requirements Document — Multi-Tenant Workspace Platform
- UI/UX Design Analysis — Slack Reference
- Database Schema Reference (to be created)
- API Specification (to be created)
