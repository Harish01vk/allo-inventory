// src/lib/schemas.ts
import { z } from "zod";

export const ReserveSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
});

export type ReserveInput = z.infer<typeof ReserveSchema>;

export const ReservationStatusEnum = z.enum(["PENDING", "CONFIRMED", "RELEASED"]);

export const ReservationSchema = z.object({
  id: z.string(),
  productId: z.string(),
  warehouseId: z.string(),
  quantity: z.number(),
  status: ReservationStatusEnum,
  expiresAt: z.string().datetime(),
  confirmedAt: z.string().datetime().nullable(),
  releasedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  product: z.object({ name: z.string(), sku: z.string(), price: z.number() }),
  warehouse: z.object({ name: z.string(), location: z.string() }),
});

export type ReservationData = z.infer<typeof ReservationSchema>;
