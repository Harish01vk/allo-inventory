// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean up
  await prisma.reservation.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.product.deleteMany();
  await prisma.warehouse.deleteMany();

  // Warehouses
  const wh1 = await prisma.warehouse.create({
    data: { name: "Mumbai Central", location: "Mumbai, MH" },
  });
  const wh2 = await prisma.warehouse.create({
    data: { name: "Delhi North", location: "Delhi, DL" },
  });
  const wh3 = await prisma.warehouse.create({
    data: { name: "Bangalore South", location: "Bangalore, KA" },
  });

  // Products
  const products = [
    {
      name: "Mechanical Keyboard Pro",
      sku: "KB-MECH-PRO-01",
      description: "TKL mechanical keyboard with Cherry MX switches, RGB backlighting, and aluminum frame.",
      price: 8999,
      imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600",
    },
    {
      name: "Wireless Noise-Cancelling Headphones",
      sku: "HP-WNC-BLK-02",
      description: "40-hour battery life, adaptive noise cancellation, foldable design.",
      price: 14999,
      imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
    },
    {
      name: "4K Webcam Ultra",
      sku: "CAM-4K-USB-03",
      description: "4K 30fps webcam with auto-focus, built-in mic, and privacy shutter.",
      price: 6499,
      imageUrl: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=600",
    },
    {
      name: "USB-C Hub 10-in-1",
      sku: "HUB-10IN1-04",
      description: "HDMI 4K, 3×USB-A, SD/MicroSD, Ethernet, 100W PD passthrough.",
      price: 3499,
      imageUrl: "https://images.unsplash.com/photo-1625894034649-ba9b8e7b4494?w=600",
    },
    {
      name: 'Ultrawide Monitor 34"',
      sku: "MON-34UW-QHD-05",
      description: "34-inch curved IPS, 3440×1440, 144Hz, FreeSync Premium, USB-C 90W.",
      price: 49999,
      imageUrl: "https://images.unsplash.com/photo-1547119957-637f8679db1e?w=600",
    },
    {
      name: "Ergonomic Desk Chair",
      sku: "CHR-ERG-BLK-06",
      description: "Lumbar support, adjustable armrests, mesh back, 5-year warranty.",
      price: 22999,
      imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600",
    },
  ];

  const stockMap: Record<string, [number, number, number]> = {
    "KB-MECH-PRO-01":  [5, 3, 2],
    "HP-WNC-BLK-02":   [8, 1, 4],
    "CAM-4K-USB-03":   [2, 6, 3],
    "HUB-10IN1-04":    [12, 9, 7],
    "MON-34UW-QHD-05": [1, 0, 2],
    "CHR-ERG-BLK-06":  [3, 5, 1],
  };

  for (const p of products) {
    const product = await prisma.product.create({ data: p });
    const [s1, s2, s3] = stockMap[p.sku];
    await prisma.stock.createMany({
      data: [
        { productId: product.id, warehouseId: wh1.id, total: s1, reserved: 0 },
        { productId: product.id, warehouseId: wh2.id, total: s2, reserved: 0 },
        { productId: product.id, warehouseId: wh3.id, total: s3, reserved: 0 },
      ],
    });
  }

  console.log("✅ Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
