# Contributing to Insaaf ERP

Thank you for your interest in contributing! This document outlines how to get started, our coding standards, and the pull request process.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Branching Strategy](#branching-strategy)
- [Commit Message Convention](#commit-message-convention)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

---

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/Insaaf.git`
3. Add the upstream remote: `git remote add upstream https://github.com/hamzahossainX/Insaaf.git`
4. Create a feature branch: `git checkout -b feat/your-feature`

---

## Development Setup

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (for local PostgreSQL)
- npm 10+

### Backend
```bash
cd backend
cp .env.example .env        # fill in your DATABASE_URL and JWT_SECRET
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev                 # starts on http://localhost:4000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                 # starts on http://localhost:5173
```

---

## Branching Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code — protected, requires PR |
| `develop` | Integration branch for features |
| `feat/*` | New features |
| `fix/*` | Bug fixes |
| `chore/*` | Dependency updates, tooling, config |
| `docs/*` | Documentation only |
| `refactor/*` | Code restructuring, no new behaviour |

---

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

```
<type>(<scope>): <short summary>

[optional body]

[optional footer — e.g. Closes #123]
```

### Types
| Type | When to use |
|---|---|
| `feat` | New feature or endpoint |
| `fix` | Bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, missing semicolons — no logic change |
| `refactor` | Code restructuring without behaviour change |
| `test` | Adding or fixing tests |
| `chore` | Build process, dependency updates, tooling |
| `perf` | Performance improvements |
| `ci` | CI/CD changes |

### Examples
```
feat(sales): add delivery employee field to new sale form
fix(payroll): correct advance deduction when multiple advances in same month
docs(readme): add Neon + Vercel deployment guide
chore(deps): upgrade Prisma to 5.22
test(domain): add edge cases for payment-split validation
```

---

## Code Style

### TypeScript
- Strict mode enabled (`"strict": true` in tsconfig)
- No `any` types — use `unknown` + type guards instead
- Prefer explicit return types on exported functions
- Use `zod` for all runtime input validation in routes

### Backend
- One service file per domain entity
- Services do all DB work inside `prisma.$transaction()`
- Derived fields (`current_balance`, `current_stock_qty`, `current_due_balance`) are **never** written directly — always update via the ledger helpers
- Every `PUT`/`DELETE` route must call `requireAdmin` middleware

### Frontend
- One page component per route file in `src/pages/`
- Use TanStack Query for all server state — no raw `useEffect` for data fetching
- `src/api/client.ts` is the only place Axios is configured
- Currency display always goes through the `currency()` helper

### Formatting
The project uses `.editorconfig` — ensure your editor respects it. Run Prettier before submitting:
```bash
npx prettier --write .
```

---

## Testing

### Backend unit tests
```bash
cd backend
npm test
```
All 17 domain tests must pass before opening a PR.

### Manual API testing
Use the `backend/API.md` reference. The seeded admin credentials:
- Phone: `01700000001`, Password: `admin123`

---

## Pull Request Process

1. Ensure `npm test` passes in `backend/`
2. Make sure no TypeScript errors: `npx tsc --noEmit` in both `backend/` and `frontend/`
3. Update `CHANGELOG.md` under `[Unreleased]`
4. Open a PR against the `develop` branch (not `main`)
5. Fill in the PR template completely
6. Request a review — PRs require at least one approval before merge
7. Squash-merge into `develop`; only `develop` → `main` merges are non-squash

---

## Reporting Issues

Use the GitHub Issue templates:
- **Bug report** — for unexpected behaviour
- **Feature request** — for new functionality

Please search existing issues before opening a new one.

---

## Code of Conduct

By contributing, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).
