# Production release checklist

## Required environment

Backend:

- `NODE_ENV=production`
- `DATABASE_URL`: Neon pooled URL with `pgbouncer=true`, `connection_limit=5`, and `pool_timeout=20`
- `DIRECT_URL`: Neon direct URL, used for migrations
- `JWT_SECRET`: unique random value of at least 32 characters
- `FRONTEND_URL`: exact HTTPS frontend origin; comma-separate multiple allowed origins

Frontend:

- `VITE_API_URL`: exact HTTPS backend origin, without `/api`

## Release order

1. Back up or verify point-in-time recovery for the production database.
2. Run `cd backend && npm ci && npm run build && npm test`.
3. Run `cd backend && npx prisma migrate deploy` once for the target database.
4. Deploy the backend and verify `/health` and `/ready` both return HTTP 200.
5. Run `cd frontend && npm ci && npm run build`, then deploy the frontend.
6. Sign in as every seeded user and use **Change Password**. Seed passwords must never remain active.
7. Verify login, Dashboard, one read from every module, CORS rejection, and role restrictions.
8. Review the deployment logs and Neon connection-pool metrics during the first real traffic.

Do not run `prisma db push`, `prisma migrate reset`, or the seed script against production data.
