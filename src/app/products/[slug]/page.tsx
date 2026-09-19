import { ProductDetail } from "@/components/storefront/product-detail";

// Next 16 — async params.
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProductDetail slug={slug} />;
}
