# Mini Operations Wallet Portal — Frontend

Next.js (App Router) + TypeScript + Tailwind UI for the NestJS wallet operations API.
Package manager: **Yarn** (v1). `yarn.lock` is the source of truth.

## How the UI talks to the API (Docker network)

The browser never calls the Nest container by Docker hostname (that DNS name is not
reachable from your laptop). Instead:

1. The UI calls same-origin **`/backend/...`** (`NEXT_PUBLIC_API_URL=/backend`).
2. Next.js **rewrites** `/backend/:path*` → `API_PROXY_TARGET/:path*`.
3. In Compose, `API_PROXY_TARGET=http://app:3001`, so the **web** container reaches
   the **app** container over the Compose network.

```
Browser → http://localhost:3000/backend/users
       → web container (Next rewrite)
       → http://app:3001/users   (Docker network)
```

## Quick start (full stack)

From the **repo root**:

```bash
cp .env.example .env
docker compose up --build
```

- Web UI: http://localhost:3000
- API: http://localhost:3001
- Swagger: http://localhost:3001/docs

## Local frontend only (API already running)

```bash
cp .env.example .env.local
yarn install
yarn dev
```

`.env.local` defaults:

```bash
NEXT_PUBLIC_API_URL=/backend
API_PROXY_TARGET=http://localhost:3001
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Browser API base — use `/backend` with the Next rewrite |
| `API_PROXY_TARGET` | Yes (server) | Nest base URL for the rewrite (`http://localhost:3001` locally, `http://app:3001` in Docker) |

## Page overview

| Route | Purpose |
|---|---|
| `/dashboard` | Today’s daily-summary stats + open wallet by ID |
| `/users` | Create user, list users, create wallet |
| `/wallets/[id]` | Wallet balance/status, credit/debit form, transaction history |
| `/reports` | Daily summary with YYYY-MM-DD date filter |

### Dashboard data source

Stats come from `GET /reports/daily-summary` only. There is no `GET /wallets` list
or global balance endpoint, so the UI shows **active wallets (today)**, credits,
debits, and transaction count — not a lifetime total balance across all wallets.

Create-wallet lives on `/users` so the manual test checklist can complete without
a separate wallets index page.

## Project structure

- `app/` — routes (App Router)
- `components/` — shared UI (`Navbar`, `WalletCard`, `TransactionTable`, `CreditDebitForm`, loading/error/empty)
- `lib/api.ts` — thin typed `fetch` wrappers
- `types/` — TypeScript shapes matching the backend

## Manual test checklist

### Happy path

- [ ] **Create a user** — `/users`: submit name, phone, email; user appears in the list
- [ ] **Create a wallet** — `/users`: pick user + currency; open `/wallets/[id]` via the success link
- [ ] **Credit a wallet** — balance increases; row appears in history
- [ ] **Debit a wallet** — debit less than balance; balance decreases
- [ ] **View transaction history** — type, amount, before/after, reference, description
- [ ] **View daily summary** — `/reports` and `/dashboard`; date filter on `/reports`

### Rejection / edge cases

- [ ] **Rejected over-debit** — clear insufficient-balance error; balance unchanged
- [ ] **Duplicate referenceId** — idempotent message; balance not double-applied
- [ ] **Client validation** — empty/invalid amount or reference blocked before API

### UI states

- [ ] **Loading** — spinner while fetching users / wallet / reports
- [ ] **Empty** — “No users yet” / “No transactions yet” / empty day on reports
- [ ] **Error** — bad wallet id or API down shows an error message
- [ ] **Navigation** — Dashboard / Users / Reports; open wallet from create link or dashboard
