# Mini Operations Wallet Portal — Backend

A scoped-down financial control panel backend of the kind used inside ride-hailing / delivery
platforms: users, wallets, money movement (credit/debit), a per-wallet transaction ledger, and a
computed daily summary report. Built with standard NestJS — no exotic patterns.

## Tech stack

- **NestJS** (TypeScript)
- **PostgreSQL**
- **TypeORM** (with SQL migrations)
- **class-validator / class-transformer** for DTO validation
- **decimal.js** for exact money math
- **Swagger** (`@nestjs/swagger`) for API docs
- **Jest** for tests
- **Docker Compose** for local setup (db + app + web)

## Endpoints

| Method | Path                          | Description                                        |
| ------ | ----------------------------- | -------------------------------------------------- |
| POST   | `/users`                      | Create a user                                      |
| GET    | `/users`                      | List users                                         |
| POST   | `/wallets`                    | Create a wallet for a user                         |
| GET    | `/wallets/:id`                | Get wallet detail                                  |
| POST   | `/wallets/:id/credit`         | Credit (add funds to) a wallet                     |
| POST   | `/wallets/:id/debit`          | Debit (remove funds from) a wallet                 |
| GET    | `/wallets/:id/transactions`   | List a wallet's transactions (newest first)        |
| GET    | `/reports/daily-summary`      | Daily summary (optional `?date=YYYY-MM-DD`, UTC)   |

Interactive API docs (Swagger UI) are served at **`/docs`** once the app is running.

## Docker Compose services

| Service | Role | Host URL |
|---|---|---|
| `db` | Postgres 16 | `localhost:5433` (default) |
| `app` | NestJS API | http://localhost:3001 |
| `web` | Next.js UI (`front-end/`) | http://localhost:3000 |

The web container proxies `/backend/*` to `http://app:3001` on the Compose network.

## Quick start with Docker Compose

On startup the app waits for Postgres to be healthy, runs migrations, then serves.
One command starts `db` + `app` + `web`:

```bash
cp .env.example .env
docker compose up --build
```

- Web UI: http://localhost:3000
- API: http://localhost:3001
- Swagger UI: http://localhost:3001/docs

Frontend details and the manual test checklist live in [`front-end/README.md`](front-end/README.md).

## Running locally (without Docker for the app)

Requires Node 22+ and a reachable Postgres. You can start just the database with compose:

```bash
cp .env.example .env
docker compose up -d db        # Postgres on localhost:5433

yarn install
yarn migration:run             # builds, then applies pending migrations
yarn start:dev                 # watch mode
```

> Migration scripts always run `yarn build` first because the TypeORM CLI loads
> `dist/database/data-source.js`. That file shares the entity list with `AppModule`
> and reads the same `DB_*` env vars.

### Migration commands

```bash
# Apply pending migrations
yarn migration:run

# Revert the last migration
yarn migration:revert

# Show migration status
yarn migration:show

# Generate a new migration from entity ↔ DB diffs (path is required)
yarn migration:generate 
```

## Environment variables

Defined in `.env` (see `.env.example`). The app and the migration CLI read the same variables.

| Variable      | Description                          | Local default |
| ------------- | ------------------------------------ | ------------- |
| `PORT`        | HTTP port the API listens on         | `3001`        |
| `DB_HOST`     | Postgres host (`db` inside compose)  | `localhost`   |
| `DB_PORT`     | Postgres host port (maps to 5432)    | `5433`        |
| `DB_USERNAME` | Postgres user                        | `postgres`    |
| `DB_PASSWORD` | Postgres password                    | `postgres`    |
| `DB_NAME`     | Postgres database                    | `mini_operations_wallet_portal` |

## Architecture overview

Standard NestJS layering — **Controller → Service → Repository**:

- Controllers handle only HTTP concerns (routing, params/body, status codes) and delegate to services.
- Services hold all business rules (balance checks, idempotency, locking, decimal math).
- Repositories are TypeORM repositories; no custom abstraction on top.

Modules:

- `UsersModule` — user creation/listing.
- `WalletsModule` — wallets **and** transactions. Transactions are owned by wallets and a
  credit/debit writes the wallet update and the transaction row in a single DB transaction, so
  keeping them in one module avoids cross-module coupling.
- `ReportsModule` — read-only aggregate reporting over the transactions table.

Data model:

- **User**: `id`, `name`, `phone`, `email`, `status`, timestamps.
- **Wallet**: `id`, `userId` (FK), `currency`, `balance`, `status`, timestamps.
- **Transaction**: `id`, `walletId` (FK), `type` (credit/debit), `amount`, `balanceBefore`,
  `balanceAfter`, `referenceId` (unique per wallet), `description`, `createdAt`. Transactions are immutable.
- **DailySummary**: **not** a table. It's computed on the fly from `transactions` (see below).

### Money & decimal handling

All money columns are Postgres `numeric(20,4)` — never `float`/`double`. The `pg` driver returns
`numeric` as JavaScript **strings**, so balances/amounts are kept as strings and all arithmetic is
done with **decimal.js**. `amount` is also accepted from the client as a string (not a JSON number)
because JSON numbers are IEEE-754 doubles and can silently lose precision. This keeps values exact
end-to-end, from the request body to the database.

### Idempotency (`referenceId`)

Every credit/debit carries a caller-supplied `referenceId`. Idempotency is **scoped per wallet**:
it is protected by a **composite unique index** on `transactions (walletId, referenceId)`, so a
`referenceId` must be unique within a wallet but may be reused on a different wallet.

- **Behavior on repeat (same wallet):** a request that reuses a `referenceId` on the same wallet
  returns the **original** transaction's result with **HTTP 200** — it is never processed twice and
  never returns an error. A newly applied transaction returns **HTTP 201**, so clients can tell a
  genuine apply from an idempotent replay.
- **Behavior on a different wallet:** the same `referenceId` used on another wallet is a brand-new
  transaction (HTTP 201).
- **How:** the service first does a fast-path lookup by `(walletId, referenceId)` and replays the
  original if found. The unique constraint is the hard backstop for the concurrent case: if two
  identical requests race past the lookup, the database rejects the second insert, its whole
  transaction (including the balance change) is rolled back, and the original transaction is
  returned instead.

### Concurrency & row-level locking

Concurrent credits/debits on the same wallet must not corrupt the balance. Inside a single database
transaction, the wallet row is read with a **pessimistic write lock**:

```ts
manager.findOne(Wallet, { where: { id }, lock: { mode: 'pessimistic_write' } });
```

This emits `SELECT ... FOR UPDATE`, so a second transaction touching the same wallet **waits** until
the first commits. This serializes money movement per wallet: two simultaneous debits can't both read
the same stale balance, and the balance can never be driven negative. No external locking service is
used — just the database.

### Daily summary is query-based (not persisted)

`GET /reports/daily-summary` computes `totalCredits`, `totalDebits`, `transactionCount`, and
`activeWallets` (distinct wallets transacted that day) with a single aggregate query over the
transactions of the requested UTC day (`[date 00:00Z, next day 00:00Z)`). Persisting a summary table
would create a second source of truth that can drift; the figures are always derivable from
transactions, so a query is simpler and always correct.

### Errors

Failed operations return specific messages rather than a bare "Bad Request":

- `400 INSUFFICIENT_BALANCE` — a debit that would go negative (includes the attempted and available amounts).
- `404` — unknown user or wallet (with the id in the message).
- `400` — validation failures (unknown/invalid fields), via the global `ValidationPipe`
  (`whitelist` + `forbidNonWhitelisted` + `transform`).

## Testing

```bash
yarn test
```

The wallet money-movement logic is covered by **integration** tests (`src/wallets/wallets.service.spec.ts`)
that run against a real Postgres (a dedicated `wallet_test` database, auto-created by the test setup) —
because locking, the unique-constraint idempotency backstop, and numeric precision only exist at the
database level. They cover:

1. Credit updates balance and records correct `balanceBefore`/`balanceAfter`.
2. Debit updates balance correctly.
3. A debit that would make the balance negative is rejected (and rolls back cleanly).
4. A duplicate `referenceId` is not processed twice on the same wallet.
5. Idempotency is scoped per wallet — the same `referenceId` applies independently on a different wallet.
6. **Concurrency (bonus):** 20 parallel debits against one wallet never overspend — exactly enough to
   drain the balance succeed, the rest are rejected, and the balance lands at exactly zero.

Tests require a reachable Postgres (e.g. `docker compose up -d db`).

## Assumptions

- **Idempotency is scoped per wallet.** A `referenceId` identifies a unique operation *within a
  single wallet*, enforced by a composite unique index on `(walletId, referenceId)`. The same key
  can therefore be reused on a different wallet (treated as a new transaction). This assumes callers
  generate reference IDs in a per-wallet context; if a globally unique key is ever required, the
  index would move back to `referenceId` alone.
- A credit/debit response uses **HTTP 201** for a newly applied transaction and **HTTP 200** for an
  idempotent replay, so clients can distinguish the two without inspecting the payload.

## Known limitations

- `GET /wallets/:id/transactions` returns the full list with no pagination; a high-volume wallet
  would eventually need paging/filtering.
- No authentication/authorization — out of scope for this assessment.
- "Day" in the daily summary is fixed to **UTC**; there is no per-request timezone option.
- Wallet `currency` is restricted to a fixed enum (`USD`, `EUR`, `GBP`, `JPY`, `KRW`, `CNY`); there is no cross-currency conversion.
- `numeric(20,4)` caps amounts at 16 integer digits; larger values would be rejected by the DB.

## AI Usage Disclosure

Font-end side has been written by AI since the job application requires someone with heavy backned experience so I have spent time more on the backend thinking about the strategies and implementation.

Backend side is AI assisted. I was asking for suggestions from AI to implement the requirements in the best way possible and avoid mistakes.

I can explain each and everything at the backend side in the live sessions and can make changes anywhere in the codes