// src/app/page.tsx
import { Suspense } from "react";
import ProductGrid from "@/components/ProductGrid";
import Header from "@/components/Header";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-950">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <p className="font-mono text-xs text-amber-400 tracking-[0.3em] uppercase mb-3">
            Live Inventory
          </p>
          <h1 className="text-5xl font-bold tracking-tight text-stone-50 leading-none">
            Products
          </h1>
          <p className="mt-3 text-stone-400 text-lg max-w-xl">
            Reserve a unit now — holds expire in 10 minutes if not confirmed.
          </p>
        </div>
        <Suspense fallback={<ProductGridSkeleton />}>
          <ProductGrid />
        </Suspense>
      </main>
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-96 bg-stone-900 rounded-2xl animate-pulse border border-stone-800"
        />
      ))}
    </div>
  );
}
