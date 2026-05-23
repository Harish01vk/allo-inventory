// src/app/api/reservations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { acquireLock } from "@/lib/lock";
import { getIdempotentResponse, storeIdempotentResponse } from "@/lib/idempotency";
import { ReserveSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const RESERVATION_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ReserveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { productId, warehouseId, quantity } = parsed.data;

    // ── Idempotency ─────────────────────────────────────────────────────────
    const idempotencyKey = req.headers.get("Idempotency-Key");
    if (idempotencyKey) {
      const cached = await getIdempotentResponse(idempotencyKey);
      if (cached) {
        return NextResponse.json(cached, { status: 200 });
      }
    }

    // ── Distributed lock ─────────────────────────────────────────────────────
    // Lock is scoped to product+warehouse so unrelated SKUs don't block each other.
    const lockKey = `reserve:${productId}:${warehouseId}`;
    const releaseLock = await acquireLock(lockKey, 8_000);
    if (!releaseLock) {
      return NextResponse.json(
        { error: "Another reservation is in progress for this item. Please retry." },
        { status: 429 }
      );
    }

    try {
      // ── Atomic stock check + decrement ────────────────────────────────────
      // We use a raw SQL UPDATE with a WHERE guard on available stock.
      // This is a single atomic operation — no TOCTOU window.
      const updated = await prisma.$executeRaw`
        UPDATE "Stock"
        SET    reserved    = reserved + ${quantity},
               "updatedAt" = NOW()
        WHERE  "productId"   = ${productId}
          AND  "warehouseId" = ${warehouseId}
          AND  (total - reserved) >= ${quantity}
      `;

      if (updated === 0) {
        return NextResponse.json(
          { error: "Not enough stock available for this product/warehouse." },
          { status: 409 }
        );
      }

      const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);

      const reservation = await prisma.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: "PENDING",
          expiresAt,
          idempotencyKey: idempotencyKey ?? undefined,
        },
        include: {
          product: { select: { name: true, sku: true, price: true } },
          warehouse: { select: { name: true, location: true } },
        },
      });

      const responseBody = { reservation };

      if (idempotencyKey) {
        await storeIdempotentResponse(idempotencyKey, responseBody);
      }

      return NextResponse.json(responseBody, { status: 201 });
    } finally {
      await releaseLock();
    }
  } catch (err) {
    console.error("[POST /api/reservations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
