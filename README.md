# Allo — Inventory & Reservation Platform

A Next.js application implementing race-condition-safe inventory reservations for multi-warehouse retail and D2C brands.

---

# Live Demo

### Application URL

https://allo-inventory-two-pi.vercel.app

### Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Prisma ORM
- Neon PostgreSQL
- Upstash Redis
- Tailwind CSS
- Zod

---

# Architecture Overview

The system prevents overselling inventory during checkout by introducing temporary inventory reservations.

A customer entering checkout receives a reservation for a limited duration (10 minutes).

During that reservation:

- Inventory is unavailable to other shoppers
- Payment can complete safely
- Inventory is either confirmed or released

The system combines:

1. Redis distributed locking
2. Atomic PostgreSQL updates
3. Reservation expiry handling
4. Idempotent reservation APIs

to guarantee correctness under concurrency.

---

# Features

## Inventory Management

- Products
- Warehouses
- Stock tracking per warehouse
- Available inventory calculation

## Reservation Flow

- Reserve inventory
- Confirm reservation
- Cancel reservation
- Automatic expiry

## Concurrency Protection

- Redis distributed lock (`SET NX PX`)
- Atomic SQL stock updates
- No overselling

## User Experience

- Live countdown timer
- Real-time status updates
- Error handling for:
  - 409 Conflict (insufficient stock)
  - 410 Gone (expired reservation)

---

# Local Setup

## Prerequisites

- Node.js 18+
- Hosted PostgreSQL database (Neon / Supabase / Railway)
- Redis instance (Upstash recommended)

---

## 1. Clone Repository

```bash
git clone https://github.com/Harish01vk/allo-inventory.git

cd allo-inventory
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Environment Variables

Create:

```bash
.env.local
```

Example:

```env
DATABASE_URL="postgresql://..."
REDIS_URL="rediss://..."
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
CRON_SECRET="your-random-secret"
```

### Environment Variables

| Variable | Description |
|-----------|------------|
| DATABASE_URL | PostgreSQL connection string |
| REDIS_URL | Upstash Redis URL |
| NEXT_PUBLIC_BASE_URL | Frontend base URL |
| CRON_SECRET | Secret protecting cron endpoint |

---

## 4. Database Setup

Generate Prisma client:

```bash
npm run db:generate
```

Push schema:

```bash
npm run db:push
```

Seed sample data:

```bash
npm run db:seed
```

---

## 5. Start Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# API Endpoints

## Products

### GET

```http
/api/products
```

Returns:

- Products
- Available stock per warehouse

---

## Warehouses

### GET

```http
/api/warehouses
```

Returns all warehouses.

---

## Create Reservation

### POST

```http
/api/reservations
```

Creates a reservation.

Returns:

```http
201 Created
```

or

```http
409 Conflict
```

when stock is unavailable.

---

## Confirm Reservation

### POST

```http
/api/reservations/:id/confirm
```

Confirms purchase.

Returns:

```http
200 OK
```

or

```http
410 Gone
```

if reservation expired.

---

## Release Reservation

### POST

```http
/api/reservations/:id/release
```

Releases inventory back into stock.

---

# Concurrency Guarantee

## Problem

If two customers attempt to reserve the last item simultaneously:

- Exactly one reservation should succeed
- Exactly one reservation should fail

---

## Solution

### Redis Distributed Lock

A lock is acquired using:

```redis
SET lock:<product>:<warehouse> token NX PX 8000
```

This guarantees only one reservation attempt proceeds at a time.

---

### Atomic SQL Update

```sql
UPDATE "Stock"
SET reserved = reserved + $quantity
WHERE productId = $productId
  AND warehouseId = $warehouseId
  AND (total - reserved) >= $quantity;
```

This update is atomic.

PostgreSQL row-level locking guarantees:

- First request succeeds
- Second request rechecks stock after lock release
- Second request receives 409 if inventory is exhausted

---

## Why This Prevents Overselling

There is no:

```text
SELECT stock
UPDATE stock
```

race condition.

The stock validation and modification happen inside the same SQL statement.

This eliminates TOCTOU (Time Of Check Time Of Use) bugs.

---

# Reservation Expiry

Reservations automatically expire after:

```text
10 minutes
```

---

## Production Cleanup

Vercel Cron invokes:

```http
/api/cron/release-expired
```

every minute.

Expired reservations:

1. Change status → RELEASED
2. Return reserved units to stock

---

## Lazy Cleanup

Every:

```http
GET /api/products
```

also triggers cleanup.

Benefits:

- Works locally
- Handles missed cron executions
- Ensures inventory eventually becomes available

---

# Idempotency (Bonus)

Supported endpoints:

```http
POST /api/reservations
POST /api/reservations/:id/confirm
```

via:

```http
Idempotency-Key
```

header.

---

## Flow

### First Request

- Operation executes
- Response cached in Redis

### Retry Request

- Same key detected
- Cached response returned

No duplicate reservations.

No duplicate confirmations.

---

# Hosting

## Production Deployment

### Frontend

Vercel

https://allo-inventory-two-pi.vercel.app

### Database

Neon PostgreSQL

### Cache / Locking

Upstash Redis

---

# Trade-offs

## Current Limitations

### No Authentication

Reservations are not tied to users.

Production systems should associate:

- Customer
- Session
- Order

with each reservation.

---

### Fixed Reservation TTL

Current:

```text
10 minutes
```

Should be configurable.

---

### Simplified Stock Model

Current stock model:

- Total
- Reserved

Production WMS systems typically include:

- Allocated
- Picked
- Packed
- In-transit
- Damaged

---

# Future Improvements

Given additional time:

- User authentication
- Order management system
- Real-time stock updates via WebSockets/SSE
- Automated integration testing
- Admin dashboard
- Inventory analytics
- Multi-region warehouse support
- Reservation audit history

---

# Repository

GitHub:

https://github.com/Harish01vk/allo-inventory

---

# Author

Harish M

VIT Chennai

B.Tech Computer Science and Engineering
