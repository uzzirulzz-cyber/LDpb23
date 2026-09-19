"use client";

import { Suspense } from "react";
import { ProductsList } from "@/components/storefront/products";

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsList />
    </Suspense>
  );
}
