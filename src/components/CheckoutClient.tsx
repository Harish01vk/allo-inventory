"use client";
// src/components/CheckoutClient.tsx

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Status = "PENDING" | "CONFIRMED" | "RELEASED";

interface Reservation {
  id: string;
  quantity: number;
  status: Status;
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  product: { name: string; sku: string; price: number };
  warehouse: { name: string; location: string };
}

function useCountdown(expiresAt: string, status: Status) {
  const getRemaining = useCallback(() => {
    if (status !== "PENDING") return 0;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  }, [expiresAt, status]);

  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    if (status !== "PENDING") return;
    const interval = setInterval(() => setRemaining(getRemaining()), 1000);
    return () => clearInterval(interval);
  }, [getRemaining, status]);

  return remaining;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CheckoutClient({ initialReservation }: { initialReservation: Reservation }) {
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation>(initialReservation);
  const [loading, setLoading] = useState<"confirm" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const remaining = useCountdown(reservation.expiresAt, reservation.status);
  const isExpired = reservation.status === "PENDING" && remaining === 0;

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(p);

  const total = reservation.product.price * reservation.quantity;

  async function handleConfirm() {
    setLoading("confirm");
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, { method: "POST" });
      const data = await res.json();
      if (res.status === 410) {
        setError(data.error ?? "Reservation has expired.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Failed to confirm. Please try again.");
        return;
      }
      setReservation(data.reservation);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  async function handleCancel() {
    setLoading("cancel");
    setError(null);
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to cancel. Please try again.");
        return;
      }
      setReservation((r) => ({ ...r, status: "RELEASED" }));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  const urgency = remaining <= 60 && remaining > 0;

  return (
    <div className="space-y-6">
      {/* Countdown banner */}
      {reservation.status === "PENDING" && (
        <div
          className={`flex items-center justify-between px-5 py-4 rounded-xl border ${
            isExpired
              ? "bg-red-950 border-red-800"
              : urgency
              ? "bg-red-950/60 border-red-800/60 animate-countdown-flash"
              : "bg-amber-950/40 border-amber-800/40"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full ${
                isExpired ? "bg-red-400" : urgency ? "bg-red-400 animate-pulse-ring" : "bg-amber-400 animate-pulse"
              }`}
            />
            <span className="text-sm text-stone-300">
              {isExpired ? "Reservation expired" : "Hold expires in"}
            </span>
          </div>
          {!isExpired && (
            <span
              className={`font-mono text-2xl font-bold ${
                urgency ? "text-red-400" : "text-amber-400"
              }`}
            >
              {formatTime(remaining)}
            </span>
          )}
        </div>
      )}

      {/* Status banner */}
      {reservation.status === "CONFIRMED" && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-emerald-950 border border-emerald-800">
          <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="font-semibold text-emerald-300">Order confirmed!</p>
            <p className="text-xs text-emerald-600 font-mono">
              {new Date(reservation.confirmedAt!).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {reservation.status === "RELEASED" && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-stone-800 border border-stone-700">
          <svg className="w-5 h-5 text-stone-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <div>
            <p className="font-semibold text-stone-300">Reservation cancelled</p>
            <p className="text-xs text-stone-500">Units have been returned to stock.</p>
          </div>
        </div>
      )}

      {/* Order summary card */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-800">
          <p className="font-mono text-xs text-stone-500 uppercase tracking-wider">Order Summary</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-stone-50">{reservation.product.name}</h2>
              <p className="font-mono text-xs text-stone-500 mt-0.5">{reservation.product.sku}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-400">{formatPrice(total)}</div>
              {reservation.quantity > 1 && (
                <div className="text-xs text-stone-500 font-mono">
                  {formatPrice(reservation.product.price)} × {reservation.quantity}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-stone-800 rounded-lg px-4 py-3">
              <p className="font-mono text-xs text-stone-500 uppercase tracking-wider mb-1">Warehouse</p>
              <p className="text-sm font-medium text-stone-200">{reservation.warehouse.name}</p>
              <p className="text-xs text-stone-500">{reservation.warehouse.location}</p>
            </div>
            <div className="bg-stone-800 rounded-lg px-4 py-3">
              <p className="font-mono text-xs text-stone-500 uppercase tracking-wider mb-1">Quantity</p>
              <p className="text-2xl font-bold text-stone-200">{reservation.quantity}</p>
            </div>
          </div>

          <div className="bg-stone-800 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="font-mono text-xs text-stone-500 uppercase tracking-wider">Reservation ID</span>
            <span className="font-mono text-xs text-stone-400">{reservation.id}</span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-950 border border-red-800 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Actions */}
      {reservation.status === "PENDING" && !isExpired && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleConfirm}
            disabled={!!loading}
            className="flex-1 py-4 px-6 rounded-xl bg-amber-400 text-stone-950 font-bold text-base hover:bg-amber-300 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading === "confirm" ? (
              <>
                <span className="w-4 h-4 border-2 border-stone-600 border-t-stone-900 rounded-full animate-spin" />
                Processing…
              </>
            ) : (
              "Confirm Purchase"
            )}
          </button>
          <button
            onClick={handleCancel}
            disabled={!!loading}
            className="flex-1 sm:flex-none sm:w-40 py-4 px-6 rounded-xl border border-stone-700 text-stone-400 font-medium text-base hover:bg-stone-800 hover:text-stone-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading === "cancel" ? (
              <>
                <span className="w-4 h-4 border-2 border-stone-600 border-t-stone-400 rounded-full animate-spin" />
                Cancelling…
              </>
            ) : (
              "Cancel"
            )}
          </button>
        </div>
      )}

      {(reservation.status === "RELEASED" || isExpired) && (
        <button
          onClick={() => router.push("/")}
          className="w-full py-4 px-6 rounded-xl bg-stone-800 text-stone-300 font-medium text-base hover:bg-stone-700 active:scale-95 transition-all"
        >
          ← Back to Products
        </button>
      )}

      {reservation.status === "CONFIRMED" && (
        <button
          onClick={() => router.push("/")}
          className="w-full py-4 px-6 rounded-xl bg-emerald-800 text-emerald-100 font-bold text-base hover:bg-emerald-700 active:scale-95 transition-all"
        >
          Continue Shopping →
        </button>
      )}
    </div>
  );
}
