// src/app/api/reservations/[id]/release/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    if (reservation.status !== "PENDING") {
      // Already released or confirmed — idempotent success
      return NextResponse.json({ message: "Reservation already settled.", status: reservation.status });
    }

    const [released] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id: params.id, status: "PENDING" },
        data: { status: "RELEASED", releasedAt: new Date() },
        include: {
          product: { select: { name: true, sku: true, price: true } },
          warehouse: { select: { name: true, location: true } },
        },
      }),
      prisma.$executeRaw`
        UPDATE "Stock"
        SET    reserved  = GREATEST(0, reserved - ${reservation.quantity}),
               "updatedAt" = NOW()
        WHERE  "productId"   = ${reservation.productId}
          AND  "warehouseId" = ${reservation.warehouseId}
      `,
    ]);

    return NextResponse.json({ reservation: released });
  } catch (err) {
    console.error("[POST /api/reservations/:id/release]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
