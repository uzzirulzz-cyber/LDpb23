"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StorefrontLayout } from "@/components/storefront/layout";

export default function PaymentFailurePage() {
  const params = useSearchParams();
  const orderNumber = params.get("order");

  return (
    <StorefrontLayout>
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="glass-navy-card p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20">
            <XCircle className="h-10 w-10 text-rose-400" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">Payment Failed</h1>
          <p className="mt-2 text-sm text-slate-400">
            Your payment could not be processed. No charges were made.
          </p>
          {orderNumber && (
            <p className="mt-1 text-xs text-slate-500">Order reference: {orderNumber}</p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="btn-gold-gradient flex-1">
              <Link href="/cart">Try Again</Link>
            </Button>
            <Button asChild variant="outline" className="btn-silver-metallic flex-1">
              <Link href="/products">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
}
