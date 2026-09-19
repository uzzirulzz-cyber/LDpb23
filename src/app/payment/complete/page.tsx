"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StorefrontLayout } from "@/components/storefront/layout";

export default function PaymentCompletePage() {
  const params = useSearchParams();
  const orderNumber = params.get("order");
  const [status, setStatus] = useState<"checking" | "confirmed">("checking");

  useEffect(() => {
    // Brief delay then redirect to success page
    const timer = setTimeout(() => {
      setStatus("confirmed");
      if (orderNumber) {
        window.location.href = `/payment/success?order=${encodeURIComponent(orderNumber)}`;
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [orderNumber]);

  return (
    <StorefrontLayout>
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="glass-navy-card p-8 text-center">
          {status === "checking" ? (
            <>
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-amber-400" />
              <h1 className="mt-4 text-xl font-bold text-white">Processing your payment…</h1>
              <p className="mt-2 text-sm text-slate-400">
                Please wait while we confirm your transaction with Rapid Gateway.
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
              <h1 className="mt-4 text-xl font-bold text-white">Redirecting…</h1>
              <p className="mt-2 text-sm text-slate-400">Taking you to your order confirmation.</p>
            </>
          )}
          {orderNumber && (
            <p className="mt-4 text-xs text-slate-500">Order: {orderNumber}</p>
          )}
          <Button asChild className="mt-6 btn-silver-metallic" size="sm">
            <Link href={`/payment/success?order=${orderNumber || ""}`}>Go to confirmation</Link>
          </Button>
        </div>
      </div>
    </StorefrontLayout>
  );
}
