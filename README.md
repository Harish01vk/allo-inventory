# Allo — Inventory & Reservation Platform

A Next.js application implementing race-condition-safe inventory reservations for multi-warehouse retail.

## Live Demo

> [Deploy your own — see hosting section below]

---

## Local Setup

### Prerequisites

- Node.js 18+
- A hosted Postgres database (Supabase, Neon, or Railway)
- Optionally: a Redis instance (Upstash, Railway) — the app runs without it in single-process dev mode

### 1. Clone & install

```bash
git clone <your-repo>
cd allo-inventory
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis URL (optional in dev) |
| `NEXT_PUBLIC_BASE_URL` | Your deployment URL (or `http://localhost:3000` locally) |
| `CRON_SECRET` | Random secret for the cron endpoint |

### 3. Database setup

```bash
npm run db:generate   # generate Prisma client
npm run db:push       # push schema to your DB (no migration history)
npm run db:seed       # seed sample products, warehouses, and stock
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How the Concurrency Guarantee Works

The core challenge: if two requests arrive simultaneously for the last unit, exactly one should succeed.

### The approach: atomic SQL UPDATE with a WHERE guard

```sql
UPDATE "Stock"
SET    reserved    = reserved + $quantity,
       "updatedAt" = NOW()
WHERE  "productId"   = $productId
  AND  "warehouseId" = $warehouseId
  AND  (total - reserved) >= $quantity   -- stock check is part of the UPDATE
```

Postgres executes this as a single atomic operation with row-level locking. If two concurrent transactions both run this update:
- The first one acquires the row lock, checks the condition, and succeeds
- The second one waits, then re-evaluates the condition after the first commits — and sees `available = 0`, so `affected rows = 0`

We return 409 whenever `affected rows = 0`.

**No TOCTOU window** — there is no separate SELECT-then-UPDATE that could be raced between.

### Distributed lock (belt-and-suspenders)

For extra safety (and to avoid DB-level lock contention under very high concurrency), a Redis `SET NX PX` lock is acquired per `(productId, warehouseId)` before the SQL update. This ensures only one goroutine at a time attempts the atomic update for a given SKU/warehouse combination. The lock is released in a `finally` block and expires automatically after 8 seconds.

**Without Redis** (dev mode): the lock falls back to an in-process `Map`, which is safe for single-instance development.

---

## Reservation Expiry

Reservations expire after 10 minutes if not confirmed. Units are returned to available stock.

### Two complementary mechanisms

**1. Vercel Cron (production)**

`vercel.json` schedules `GET /api/cron/release-expired` every minute. This calls `releaseExpiredReservations()` which:
- Finds all `PENDING` reservations with `expiresAt < NOW()`
- Updates their status to `RELEASED` in a transaction
- Decrements `Stock.reserved` for each

Protected by `Authorization: Bearer <CRON_SECRET>` to prevent public abuse.

**2. Lazy cleanup on product listing**

Every `GET /api/products` call also triggers `releaseExpiredReservations()`. This means even without a cron job, stock eventually becomes visible as soon as the products page is loaded — a useful safety net for local dev and edge cases.

---

## Idempotency (Bonus)

The `POST /api/reservations` and `POST /api/reservations/:id/confirm` endpoints support idempotency via the `Idempotency-Key` header.

### Implementation

1. **On request**: check Redis for `idempotency:<key>`. If found, return the cached response immediately.
2. **On success**: store the response body in Redis at `idempotency:<key>` with a 24-hour TTL.

This means a client that retries after a timeout (e.g., 3DS redirect) gets the original reservation back instead of creating a duplicate or double-confirming.

**Without Redis**: idempotency is silently skipped (still correct, just not idempotent).

---

## Hosting

| Service | Purpose | Free tier |
|---|---|---|
| [Vercel](https://vercel.com) | Next.js hosting + cron | Yes |
| [Supabase](https://supabase.com) or [Neon](https://neon.tech) | Postgres | Yes |
| [Upstash](https://upstash.com) | Redis | Yes |

Deploy:
```bash
vercel deploy
```

Set env vars in Vercel dashboard, then:
```bash
# Run migrations against production DB
DATABASE_URL="<prod-url>" npm run db:push
DATABASE_URL="<prod-url>" npm run db:seed
```

---

## Trade-offs & What I'd Do Differently

### Current trade-offs

- **No auth**: Any user can reserve, confirm, or release any reservation by ID. In production, reservations would be tied to a user/session/order.
- **10-minute fixed TTL**: Reasonable for a payment flow but should be configurable per product or flow type.
- **Lazy expiry only fires on /api/products**: If no one visits the listing, very old reservations don't get swept up until the cron job runs. For an SLA-sensitive system, I'd add a dedicated background worker.
- **No retry with backoff on the 429**: The frontend just shows an error if the lock is contested. A proper client would do exponential backoff.
- **Stock model is simple**: No concept of allocated vs. soft-allocated vs. in-transit. A real WMS would be much richer.

### With more time

- Session-tied reservations with a proper order model
- Webhook/event stream so the product page stock numbers update in real time (Server-Sent Events or Supabase Realtime)
- End-to-end integration tests using Vitest + Prisma test database
- Optimistic UI updates with rollback on the product listing
- Admin dashboard for warehouse staff to adjust stock levels
