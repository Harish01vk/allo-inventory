// src/components/ProductGrid.tsx
import ProductCard from "./ProductCard";

async function fetchProducts() {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const res = await fetch(`${baseUrl}/api/products`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export default async function ProductGrid() {
  const { products } = await fetchProducts();

  if (!products?.length) {
    return (
      <div className="text-center py-24 text-stone-500">
        No products found. Run{" "}
        <code className="font-mono bg-stone-800 px-1 rounded">npm run db:seed</code> to add sample data.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product: any) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
