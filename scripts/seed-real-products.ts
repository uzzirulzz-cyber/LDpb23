import { db } from "@/lib/db";
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const products = JSON.parse(fs.readFileSync("/tmp/real-products.json", "utf8"));

async function seed() {
  console.log(`🌱 Seeding ${products.length} REAL products from MongoDB into PostgreSQL...`);

  // Wipe existing placeholder products + inventory
  await db.inventoryItem.deleteMany();
  await db.product.deleteMany();
  console.log("  ✓ Cleared placeholder products + inventory");

  for (const p of products) {
    const product = await db.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        category: p.category,
        subcategory: p.subcategory,
        price: Number(p.price),
        currency: p.currency || "PKR",
        digital: Boolean(p.digital),
        deliveryType: p.deliveryType || (p.digital ? "Instant Auto-Email" : "Courier Shipping"),
        stock: Number(p.stock) || (p.digital ? 999 : 0),
        description: p.description || p.shortDescription || `${p.name} — official product from PlayBeat.`,
        images: JSON.stringify(p.images?.length ? p.images : (p.image ? [p.image] : [])),
        variants: JSON.stringify(p.variants || []),
        active: true,
        rating: Number(p.rating) || 0,
      },
    });

    // Create matching inventory item
    await db.inventoryItem.create({
      data: {
        sku: product.sku,
        name: product.name,
        productId: product.id,
        stock: product.stock,
        reserved: 0,
        reorderLevel: product.digital ? 50 : 5,
        location: product.digital ? "Digital Vault" : "Warehouse PK",
        cost: Number((product.price * 0.6).toFixed(2)),
        currency: product.currency,
      },
    });
  }

  console.log(`✅ Seeded ${products.length} real products + inventory items into PostgreSQL.`);

  // Verify
  const count = await db.product.count();
  const invCount = await db.inventoryItem.count();
  const cats = await db.product.groupBy({ by: ["category"], _count: true });
  console.log(`   Products: ${count} | Inventory: ${invCount}`);
  console.log("   Categories:", cats.map(c => `${c.category}(${c._count})`).join(", "));
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
