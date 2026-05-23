// src/components/ProductGrid.tsx
import { prisma } from "@/lib/prisma";
import { releaseExpiredReservations } from "@/lib/expiry";
import ProductCard from "./ProductCard";

async function fetchProducts() {
  await releaseExpiredReservations();

  return prisma.product.findMany({
    include: {
      stocks: {
        include: { warehouse: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export default async function ProductGrid() {
  const products = await fetchProducts();

  if (!products?.length) {
    return (
      <div className="text-center py-24 text-stone-500">
        No products found. Run{" "}
        <code className="font-mono bg-stone-800 px-1 rounded">npm run db:seed</code> to add sample data.
      </div>
    );
  }

  const shaped = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    description: p.description,
    imageUrl: p.imageUrl,
    price: p.price,
    stocks: p.stocks.map((s) => ({
      warehouseId: s.warehouseId,
      warehouseName: s.warehouse.name,
      warehouseLocation: s.warehouse.location,
      total: s.total,
      reserved: s.reserved,
      available: s.total - s.reserved,
    })),
  }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {shaped.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}