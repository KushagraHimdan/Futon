# Futon

> Modern Multi-Tenant SaaS Workspace Platform

Futon is a production-ready, multi-tenant collaboration workspace platform designed for seamless team onboarding, strict tenant data isolation, role-based access control (RBAC), and automated subscription billing.

## 🚀 Features

- **Strict Multi-Tenant Isolation:** Database-level Row-Level Security (RLS) combined with tenant-scoping query middleware.
- **Role-Based Access Control (RBAC):** Fixed hierarchy (`Owner`, `Admin`, `Member`) with granular permission boundaries.
- **Fast Onboarding:** Self-serve workspace creation, invite links, and member management.
- **Automated Billing:** Stripe Checkout, self-serve customer portal, webhook event queue, and plan feature gating.
- **Reliable Async Processing:** Redis + BullMQ for emails, webhook handling, and audit logs.
- **Auditing & Observability:** Structured JSON logging with request IDs and tenant attribution.

## 🛠️ Architecture & Tech Stack

- **Backend:** Node.js, Express, Prisma ORM, PostgreSQL, Redis, BullMQ
- **Frontend:** React, Vite, Tailwind CSS, TanStack Query, Zustand
- **Auth:** JWT access/refresh token rotation, bcrypt password hashing
- **Payments:** Stripe API (Checkout & Customer Portal)

## 📁 Repository Structure

```
Futon/
├── client/              # React + Vite frontend application
├── server/              # Node.js + Express backend API
├── .github/             # CI/CD workflows and Dependabot
├── memory.md            # Progress tracking & session memory
├── PRD_Multi_Tenant...  # Product Requirements Document
└── Tech_Stack_Multi...  # Technical Architecture & Stack Specification
```

## 🏁 Getting Started

### Prerequisites
- Node.js >= 18
- PostgreSQL instance
- Redis instance

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd Futon

# Install root & workspace dependencies
npm install

# Setup environment variables
cp server/.env.example server/.env
cp client/.env.example client/.env

# Run database migrations
cd server && npx prisma migrate dev

# Run development servers
npm run dev
```

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
