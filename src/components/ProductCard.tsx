"use client";
// src/components/ProductCard.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface StockEntry {
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  total: number;
  reserved: number;
  available: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  imageUrl: string;
  price: number;
  stocks: StockEntry[];
}

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
    product.stocks.find((s) => s.available > 0)?.warehouseId ?? product.stocks[0]?.warehouseId ?? ""
  );
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStock = product.stocks.find((s) => s.warehouseId === selectedWarehouseId);
  const available = selectedStock?.available ?? 0;
  const canReserve = available > 0 && quantity <= available;

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(p);

  async function handleReserve() {
    if (!canReserve) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: selectedWarehouseId,
          quantity,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        setError(data.error ?? "Not enough stock available.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push(`/checkout/${data.reservation.id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="group bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden flex flex-col hover:border-stone-600 transition-all duration-300 hover:shadow-xl hover:shadow-stone-900/50">
      {/* Image */}
      <div className="relative h-52 bg-stone-800 overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-600">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" opacity="0.4" />
            </svg>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="font-mono text-xs bg-stone-950/80 text-stone-300 px-2 py-1 rounded-md backdrop-blur">
            {product.sku}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h2 className="font-bold text-lg text-stone-50 leading-tight mb-1">{product.name}</h2>
        <p className="text-stone-500 text-sm mb-4 flex-1 line-clamp-2">{product.description}</p>

        <div className="text-2xl font-bold text-amber-400 mb-4">{formatPrice(product.price)}</div>

        {/* Warehouse selector */}
        <div className="mb-3">
          <label className="font-mono text-xs text-stone-500 uppercase tracking-wider block mb-1.5">
            Warehouse
          </label>
          <div className="flex flex-col gap-1.5">
            {product.stocks.map((s) => (
              <button
                key={s.warehouseId}
                onClick={() => setSelectedWarehouseId(s.warehouseId)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all ${
                  selectedWarehouseId === s.warehouseId
                    ? "border-amber-400 bg-amber-400/10 text-stone-50"
                    : "border-stone-700 bg-stone-800 text-stone-400 hover:border-stone-600"
                } ${s.available === 0 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                disabled={s.available === 0}
              >
                <span className="font-medium">{s.warehouseName}</span>
                <span
                  className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                    s.available > 0
                      ? "bg-emerald-900/60 text-emerald-400"
                      : "bg-red-900/60 text-red-400"
                  }`}
                >
                  {s.available > 0 ? `${s.available} avail.` : "Out of stock"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        {available > 0 && (
          <div className="mb-4">
            <label className="font-mono text-xs text-stone-500 uppercase tracking-wider block mb-1.5">
              Quantity
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 hover:bg-stone-700 transition-colors flex items-center justify-center text-lg leading-none"
              >
                −
              </button>
              <span className="font-mono text-lg font-medium text-stone-50 w-6 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(available, q + 1))}
                className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 hover:bg-stone-700 transition-colors flex items-center justify-center text-lg leading-none"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-3 px-3 py-2 bg-red-950 border border-red-800 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleReserve}
          disabled={!canReserve || loading}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 ${
            canReserve && !loading
              ? "bg-amber-400 text-stone-950 hover:bg-amber-300 active:scale-95"
              : "bg-stone-800 text-stone-600 cursor-not-allowed"
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-stone-600 border-t-stone-400 rounded-full animate-spin" />
              Reserving…
            </span>
          ) : available === 0 ? (
            "Out of Stock"
          ) : (
            "Reserve Now →"
          )}
        </button>
      </div>
    </div>
  );
}
