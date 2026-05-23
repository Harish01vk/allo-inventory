// src/app/api/reservations/[id]/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIdempotentResponse, storeIdempotentResponse } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idempotencyKey = req.headers.get("Idempotency-Key");
    if (idempotencyKey) {
      const cached = await getIdempotentResponse(`confirm:${idempotencyKey}`);
      if (cached) return NextResponse.json(cached, { status: 200 });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
      include: {
        product: { select: { name: true, sku: true, price: true } },
        warehouse: { select: { name: true, location: true } },
      },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    if (reservation.status === "CONFIRMED") {
      return NextResponse.json({ reservation });
    }

    if (reservation.status === "RELEASED") {
      return NextResponse.json({ error: "Reservation has already been released." }, { status: 410 });
    }

    // Check expiry
    if (reservation.expiresAt < new Date()) {
      // Lazily release the expired reservation
      await prisma.$transaction([
        prisma.reservation.update({
          where: { id: params.id },
          data: { status: "RELEASED", releasedAt: new Date() },
        }),
        prisma.$executeRaw`
          UPDATE "Stock"
          SET    reserved  = GREATEST(0, reserved - ${reservation.quantity}),
                 "updatedAt" = NOW()
          WHERE  "productId"   = ${reservation.productId}
            AND  "warehouseId" = ${reservation.warehouseId}
        `,
      ]);

      return NextResponse.json(
        { error: "Reservation has expired. Please start again." },
        { status: 410 }
      );
    }

    // Confirm — permanently decrement stock (reserved → confirmed, stock.reserved freed)
    const [confirmed] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id: params.id, status: "PENDING" },
        data: { status: "CONFIRMED", confirmedAt: new Date() },
        include: {
          product: { select: { name: true, sku: true, price: true } },
          warehouse: { select: { name: true, location: true } },
        },
      }),
      // Decrement both total and reserved so the units are gone for good
      prisma.$executeRaw`
        UPDATE "Stock"
        SET    total      = GREATEST(0, total - ${reservation.quantity}),
               reserved   = GREATEST(0, reserved - ${reservation.quantity}),
               "updatedAt" = NOW()
        WHERE  "productId"   = ${reservation.productId}
          AND  "warehouseId" = ${reservation.warehouseId}
      `,
    ]);

    const responseBody = { reservation: confirmed };
    if (idempotencyKey) {
      await storeIdempotentResponse(`confirm:${idempotencyKey}`, responseBody);
    }

    return NextResponse.json(responseBody);
  } catch (err) {
    console.error("[POST /api/reservations/:id/confirm]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
