// src/lib/expiry.ts
import { prisma } from "./prisma";

/**
 * Release all reservations whose expiresAt has passed and are still PENDING.
 * Called:
 *   1. Lazily on each GET /api/products request (keeps stock fresh without infra).
 *   2. By the Vercel Cron job at /api/cron/release-expired (production).
 */
export async function releaseExpiredReservations(): Promise<number> {
  const now = new Date();

  // Use a transaction so stock updates are atomic with status change
  const expired = await prisma.reservation.findMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
    select: { id: true, productId: true, warehouseId: true, quantity: true },
  });

  if (expired.length === 0) return 0;

  await prisma.$transaction(
    expired.map((r) =>
      prisma.$executeRaw`
        UPDATE "Reservation"
        SET    status = 'RELEASED', "releasedAt" = NOW(), "updatedAt" = NOW()
        WHERE  id = ${r.id} AND status = 'PENDING'
      `
    )
  );

  // Return reserved units to available stock
  await prisma.$transaction(
    expired.map((r) =>
      prisma.$executeRaw`
        UPDATE "Stock"
        SET    reserved  = GREATEST(0, reserved - ${r.quantity}),
               "updatedAt" = NOW()
        WHERE  "productId" = ${r.productId}
          AND  "warehouseId" = ${r.warehouseId}
      `
    )
  );

  return expired.length;
}
