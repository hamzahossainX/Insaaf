# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅ Yes    |
| < 1.0   | ❌ No     |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability in Insaaf ERP, please report it responsibly:

1. **Email**: hamzahossain3842@gmail.com
2. **Subject**: `[SECURITY] Insaaf ERP — <brief description>`
3. Include:
   - A description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fix (optional)

We aim to respond within **48 hours** and provide a patch within **7 days** for confirmed critical vulnerabilities.

## Security Practices

- JWT secrets must be long random strings in production (`openssl rand -hex 64`)
- All passwords hashed with bcrypt (rounds = 10)
- CORS is locked to the `FRONTEND_URL` environment variable — never `*` in production
- All `PUT`/`DELETE` endpoints enforce `ADMIN` role server-side — not just hidden in the UI
- Financial and stock records use soft-delete — no hard deletes that could mask fraud
- Session tokens stored in `sessionStorage` (cleared on tab/browser close)
- All session tokens verified against the backend on app load — stale tokens are rejected
- Database credentials are never committed — use `.env` (gitignored) or Vercel/Neon env vars
- Prisma parameterised queries — no raw SQL string interpolation

## Responsible Disclosure

We follow responsible disclosure principles. Once a fix is released, we will publicly acknowledge the reporter (unless they prefer to remain anonymous) in the release notes.
