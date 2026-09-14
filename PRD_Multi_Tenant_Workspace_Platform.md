# Product Requirements Document (PRD)

## Multi-Tenant Workspace Platform

|                    |                    |
| ------------------ | ------------------ |
| **Document Owner** | Product Team       |
| **Status**         | Draft v1.0         |
| **Last Updated**   | September 13, 2026 |
| **Target Release** | TBD                |

---

## 1. Overview

### 1.1 Problem Statement

Companies need a way to collaborate in a dedicated, secure digital workspace without their data mixing with other organizations. Existing solutions either force customers into single-tenant deployments (expensive, hard to scale operationally) or lack proper role-based access control and self-serve billing, making onboarding new customers a manual, engineering-heavy process.

### 1.2 Vision

Build a **multi-tenant SaaS workspace platform** where any company can sign up, create an isolated workspace, invite team members with appropriate access levels, and manage their subscription — all without manual provisioning by our team.

### 1.3 Goals

- Enable self-serve company (tenant) onboarding in under 5 minutes.
- Guarantee strict data isolation between tenants.
- Support role-based collaboration (Owner, Admin, Member) within a company.
- Automate subscription billing and enforce plan-based feature/usage limits via Stripe.
- Lay a foundation that scales to thousands of tenants without re-architecture.

### 1.4 Non-Goals (v1)

- Custom/granular permission builder (fixed roles only for v1).
- Subdomain-per-tenant routing (deferred; see Open Questions).
- SSO/SAML enterprise login (planned for a later phase).
- Cross-company data sharing or workspace federation.

---

## 2. Target Users & Personas

| Persona                  | Description                                                                         | Key Needs                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Company Owner**        | The person who signs up and creates the workspace (typically founder/admin/IT lead) | Fast setup, billing control, full visibility into members                               |
| **Admin**                | Invited by Owner to help manage the workspace                                       | Ability to invite/remove members, manage settings, no billing access                    |
| **Member**               | Regular invited team member                                                         | Access to workspace resources relevant to their role, simple onboarding via invite link |
| **Prospective Customer** | Someone evaluating the product before committing                                    | Clear signup flow, trial or free-tier access, transparent pricing                       |

---

## 3. User Stories

### 3.1 Workspace & Tenant Management

- As a **new user**, I can sign up and automatically create a new Company workspace, becoming its Owner.
- As an **Owner**, I can rename my company, update company profile details, and delete the workspace (with confirmation safeguards).
- As a **user belonging to multiple companies**, I can switch between workspaces without logging out.

### 3.2 Member & Role Management

- As an **Owner/Admin**, I can invite new members via email, specifying their role (Admin or Member).
- As an **invited user**, I receive an email with a secure, time-limited invite link to join the workspace.
- As an **Owner/Admin**, I can view a list of all members, their roles, and status (invited/active).
- As an **Owner/Admin**, I can change a member's role or remove them from the workspace.
- As an **Owner**, I am the only one who can transfer ownership or delete the company.
- As a **Member**, I cannot invite others or change workspace settings.

### 3.3 Billing & Subscription

- As an **Owner**, I can view available subscription plans and select one during or after onboarding.
- As an **Owner**, I can enter payment details via Stripe Checkout and start a subscription.
- As an **Owner**, I can view my current plan, billing history, and update/cancel my subscription.
- As a **system**, I must automatically reflect subscription status changes (upgrades, downgrades, failed payments, cancellations) via Stripe webhooks.
- As a **user on an expired/canceled subscription**, I should see a graceful downgrade experience (read-only access or feature lock) rather than being abruptly locked out.

### 3.4 Security & Isolation

- As a **tenant**, my company's data must never be visible or accessible to another tenant, under any circumstance, including via API manipulation.
- As a **user**, my session should always be scoped to the workspace I am currently active in.

---

## 4. Functional Requirements

### 4.1 Authentication

- Email/password signup and login.
- Password hashing (bcrypt/argon2), secure session via JWT.
- Email verification on signup.
- Password reset flow.
- (Future) OAuth/social login, SSO/SAML.

### 4.2 Tenant (Company) Management

- Company creation tied 1:1 with an initial Owner.
- Company profile: name, logo, timezone, industry (optional metadata).
- Soft-delete on company deletion with a grace period before permanent purge.
- Every data record scoped to `company_id`; enforced at the query layer and reinforced with database-level Row-Level Security policies.

### 4.3 Membership & Roles

- Fixed roles: **Owner**, **Admin**, **Member**.
- Permission matrix:

| Action                     | Owner |     Admin      | Member |
| -------------------------- | :---: | :------------: | :----: |
| Manage billing             |  ✅   |       ❌       |   ❌   |
| Invite members             |  ✅   |       ✅       |   ❌   |
| Remove members             |  ✅   |       ✅       |   ❌   |
| Change member roles        |  ✅   | ✅ (not Owner) |   ❌   |
| Edit company settings      |  ✅   |       ✅       |   ❌   |
| Delete company             |  ✅   |       ❌       |   ❌   |
| Access workspace resources |  ✅   |       ✅       |   ✅   |

- A company must always have at least one Owner (block removal/downgrade of the last Owner).
- Invitations expire after a configurable period (default 7 days) and can be resent.

### 4.4 Billing (Stripe Integration)

- Plans defined as Stripe Products/Prices (e.g., Free, Pro, Enterprise).
- One Stripe Customer per Company.
- Stripe Checkout for initial subscription; Stripe Billing Portal for self-serve plan changes/cancellation.
- Webhook listener for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
- Grace period handling for failed payments before feature restriction.
- Usage limits per plan (e.g., max members) enforced at the application layer.

### 4.5 Notifications

- Transactional emails: invite, welcome, password reset, payment failure, subscription renewal reminders.

---

## 5. Non-Functional Requirements

| Category         | Requirement                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security**     | All tenant data isolated at query and DB level (RLS). All traffic over HTTPS. Secrets managed via environment/secret manager, never hardcoded. |
| **Performance**  | API p95 response time < 300ms for core CRUD operations under expected load.                                                                    |
| **Scalability**  | Architecture must support horizontal scaling of the application layer; DB schema must not require redesign up to ~10,000 tenants.              |
| **Availability** | Target 99.9% uptime for core workspace and auth services.                                                                                      |
| **Compliance**   | GDPR-aware data handling (data export/delete on request). PCI compliance delegated to Stripe (no raw card data touches our servers).           |
| **Auditability** | All role changes, invites, removals, and billing events logged with actor, timestamp, and target.                                              |

---

## 6. Data Model (High-Level)

```
Company
 - id, name, slug, stripe_customer_id, subscription_status, plan, created_at, deleted_at

User
 - id, email, password_hash, name, created_at

Membership  (join table: User <-> Company)
 - id, user_id, company_id, role [owner|admin|member], status [invited|active], joined_at

Invitation
 - id, company_id, email, role, token, expires_at, accepted_at

AuditLog
 - id, company_id, actor_user_id, action, target, metadata, created_at
```

---

## 7. Tenant Isolation Strategy

- **Model:** Shared database, shared schema, with `company_id` as a mandatory column on every tenant-scoped table.
- **Enforcement layers:**
  1. Application-layer query scoping (every query filtered by `company_id` from the authenticated session).
  2. PostgreSQL Row-Level Security policies as a defense-in-depth backstop against missed scoping in application code.
- **Tenant context resolution:** Derived from the authenticated user's session/JWT (`active_company_id`), not from the URL — no subdomain or path-based routing in v1.

---

## 8. Success Metrics (KPIs)

| Metric                                                    | Target                    |
| --------------------------------------------------------- | ------------------------- |
| Time to first workspace created (signup → active company) | < 5 minutes               |
| Invite acceptance rate                                    | > 60%                     |
| Self-serve subscription conversion rate                   | Baseline TBD after launch |
| Cross-tenant data leakage incidents                       | 0 (hard requirement)      |
| Monthly churn rate                                        | Baseline TBD after launch |

---

## 9. Rollout Plan

| Phase                        | Scope                                                              |
| ---------------------------- | ------------------------------------------------------------------ |
| **Phase 1 – Foundation**     | Auth, Company/User/Membership schema, tenant-scoped middleware     |
| **Phase 2 – Workspace Core** | Company creation, invite flow, member management, role enforcement |
| **Phase 3 – Billing**        | Stripe Checkout integration, webhook handling, plan gating         |
| **Phase 4 – Hardening**      | RLS policies, audit logging, rate limiting, monitoring/alerting    |
| **Phase 5 – GA**             | Public launch, documentation, support playbooks                    |

---

## 10. Open Questions

1. Do we need subdomain-based routing for enterprise branding in a future phase?
2. What are the exact plan tiers and pricing (Free/Pro/Enterprise limits)?
3. Do we need SSO/SAML support for enterprise deals, and on what timeline?
4. What is our data retention policy after a company deletes its workspace?
5. Do we need a "read-only" grace state for expired subscriptions, or immediate lockout?

---

## 11. Appendix

### 11.1 Glossary

- **Tenant / Company:** An isolated organizational unit within the platform.
- **Membership:** The relationship connecting a User to a Company with a specific Role.
- **RLS (Row-Level Security):** A PostgreSQL feature restricting which rows a query can access based on context (here, `company_id`).

### 11.2 Related Documents

- Technical Architecture Document (to be created)
- API Specification (to be created)
- Database Schema Reference (to be created)
