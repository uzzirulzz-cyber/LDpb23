"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Copy, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StorefrontLayout } from "@/components/storefront/layout";
import { toast } from "sonner";

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    licenseKeys: string | string[];
    deliveryType: string;
  }>;
}

export default function PaymentSuccessPage() {
  const params = useSearchParams();
  const orderNumber = params.get("order");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    const init = () => {
      if (!orderNumber) {
        setLoading(false);
        return;
      }
      poll();
    };

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/store/orders/status?orderNumber=${encodeURIComponent(orderNumber)}`);
        const json = await res.json();
        if (cancelled) return;

        if (json.data) {
          setOrder(json.data);
          // Stop polling once payment is confirmed
          if (json.data.paymentStatus === "paid") {
            setLoading(false);
            return;
          }
        }

        // Keep polling for up to ~30 seconds (webhook may take a moment)
        setPollCount((c) => {
          if (c >= 15) {
            setLoading(false);
            return c;
          }
          setTimeout(poll, 2000);
          return c + 1;
        });
      } catch {
        if (!cancelled) {
          setPollCount((c) => {
            if (c >= 15) {
              setLoading(false);
              return c;
            }
            setTimeout(poll, 2000);
            return c + 1;
          });
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, [orderNumber]);

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("License key copied");
  };

  return (
    <StorefrontLayout>
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        {loading ? (
          <div className="glass-navy-card p-8 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-amber-400" />
            <h1 className="mt-4 text-xl font-bold text-white">Confirming your payment…</h1>
            <p className="mt-2 text-sm text-slate-400">
              We're waiting for payment confirmation from Rapid Gateway. This usually takes a few seconds.
            </p>
            <p className="mt-1 text-xs text-slate-500">Order: {orderNumber}</p>
          </div>
        ) : order && order.paymentStatus === "paid" ? (
          <div className="glass-navy-card overflow-hidden p-8">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-white">Payment Successful!</h1>
              <p className="mt-2 text-sm text-slate-400">
                Order <span className="font-mono text-amber-300">{order.orderNumber}</span> ·{" "}
                {order.currency} {order.total.toLocaleString()}
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Your License Keys
              </h2>
              {order.items.map((item) => {
                const keys = Array.isArray(item.licenseKeys)
                  ? item.licenseKeys
                  : (() => {
                      try { return JSON.parse(item.licenseKeys as string); } catch { return []; }
                    })();
                return (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white">{item.name}</p>
                      <span className="text-xs text-slate-500">Qty: {item.quantity}</span>
                    </div>
                    {keys.length > 0 ? (
                      <div className="mt-2 space-y-1.5">
                        {keys.map((key: string, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <code className="flex-1 rounded bg-black/40 px-2 py-1 font-mono text-xs text-amber-300">
                              {key}
                            </code>
                            <button
                              onClick={() => copyKey(key)}
                              className="rounded p-1.5 text-slate-400 hover:text-white hover:bg-white/10"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">
                        {item.deliveryType === "Instant Auto-Email"
                          ? "License keys will be emailed to you shortly."
                          : "This item will be shipped to your address."}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="btn-gold-gradient flex-1">
                <Link href="/account"><Package className="mr-2 h-4 w-4" /> View My Orders</Link>
              </Button>
              <Button asChild variant="outline" className="btn-silver-metallic flex-1">
                <Link href="/products">Continue Shopping</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="glass-navy-card p-8 text-center">
            <h1 className="text-xl font-bold text-white">Order Received</h1>
            <p className="mt-2 text-sm text-slate-400">
              Your order <span className="font-mono text-amber-300">{orderNumber}</span> has been placed.
              Payment confirmation is still pending — check your account for updates.
            </p>
            <Button asChild className="mt-6 btn-gold-gradient">
              <Link href="/account">View My Orders</Link>
            </Button>
          </div>
        )}
      </div>
    </StorefrontLayout>
  );
}
