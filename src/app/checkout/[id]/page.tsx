// src/app/checkout/[id]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Header from "@/components/Header";
import CheckoutClient from "@/components/CheckoutClient";

async function getReservation(id: string) {
  return prisma.reservation.findUnique({
    where: { id },
    include: {
      product: { select: { name: true, sku: true, price: true } },
      warehouse: { select: { name: true, location: true } },
    },
  });
}

export default async function CheckoutPage({ params }: { params: { id: string } }) {
  const reservation = await getReservation(params.id);
  if (!reservation) notFound();

  const serialized = {
    ...reservation,
    expiresAt: reservation.expiresAt.toISOString(),
    confirmedAt: reservation.confirmedAt?.toISOString() ?? null,
    releasedAt: reservation.releasedAt?.toISOString() ?? null,
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
  };

  return (
    <div className="min-h-screen bg-stone-950">
      <Header />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <p className="font-mono text-xs text-amber-400 tracking-[0.3em] uppercase mb-3">
            Reservation
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-stone-50">
            Complete your order
          </h1>
        </div>
        <CheckoutClient initialReservation={serialized} />
      </main>
    </div>
  );
}