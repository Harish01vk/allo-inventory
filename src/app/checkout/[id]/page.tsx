// src/app/checkout/[id]/page.tsx
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import CheckoutClient from "@/components/CheckoutClient";

async function getReservation(id: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const res = await fetch(`${baseUrl}/api/reservations/${id}`, {
    cache: "no-store",
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load reservation");
  const data = await res.json();
  return data.reservation;
}

export default async function CheckoutPage({ params }: { params: { id: string } }) {
  const reservation = await getReservation(params.id);
  if (!reservation) notFound();

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
        <CheckoutClient initialReservation={reservation} />
      </main>
    </div>
  );
}
