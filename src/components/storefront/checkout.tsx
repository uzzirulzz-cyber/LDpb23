"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Loader2,
  Lock,
  ShieldCheck,
  Zap,
  Home as HomeIcon,
  ShoppingBag,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { StorefrontLayout } from "./layout";
import { categoryMeta, priceOf, type StoreProduct } from "./product-card";
import { useCustomerId } from "./use-customer-id";
import { formatMoney } from "@/lib/currency";
import { trackMetaEvent } from "@/lib/pixel";

type CartItem = { id: string; quantity: number; product: StoreProduct };
type CartData = { id: string; items: CartItem[] };
type CartResponse = { data?: CartData; error?: string };

type OrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  licenseKeys: string[];
  deliveryType: string;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  items: OrderItem[];
};

type CheckoutResponse = { data?: { order: Order; checkoutUrl: string | null; message?: string }; error?: string };

const PAYMENT_METHODS = [
  { value: "card", label: "Credit / Debit Card" },
  { value: "easypaisa", label: "Easypaisa" },
  { value: "jazzcash", label: "Jazzcash" },
  { value: "crypto", label: "Crypto (USDT / BTC)" },
  { value: "bank-transfer", label: "Bank Transfer" },
];

const LS_PROFILE_KEY = "playbeat_checkout_profile";

type FormState = {
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  paymentMethod: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  country: "Pakistan",
  city: "",
  address: "",
  paymentMethod: "card",
};

export function CheckoutView() {
  const router = useRouter();
  const customerId = useCustomerId();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);

  const refresh = useCallback(async () => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/store/cart?customerId=${encodeURIComponent(customerId)}`, { cache: "no-store" });
      const json: CartResponse = await res.json();
      if (json.error) throw new Error(json.error);
      setCart(json.data ?? null);
    } catch (e) {
      toast.error("Could not load cart", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LS_PROFILE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<FormState>;
        setForm((f) => ({ ...f, ...saved }));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!loading && cart && cart.items.length === 0 && !order) {
      router.replace("/cart");
    }
  }, [loading, cart, order, router]);

  const items = cart?.items ?? [];
  const subtotal = useMemo(
    () => items.reduce((s, i) => s + Number(i.product?.price ?? 0) * i.quantity, 0),
    [items]
  );

  const setField = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onPlaceOrder = async () => {
    if (!customerId) {
      toast.error("Unable to identify customer. Please enable cookies.");
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.city.trim() || !form.address.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      try {
        window.localStorage.setItem(LS_PROFILE_KEY, JSON.stringify(form));
      } catch {
        // ignore
      }

      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          email: form.email,
          name: form.name,
          phone: form.phone,
          sourceCurrency: "PKR",
        }),
      });
      const json: CheckoutResponse = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? `Checkout failed (${res.status})`);
      }
      const ord = json.data!;
      window.dispatchEvent(new Event("playbeat-cart-updated"));

      // If Rapid Gateway returned a checkout URL, redirect to it
      if (ord.checkoutUrl) {
        toast.success("Redirecting to secure payment…", { description: ord.order.orderNumber });
        window.location.href = ord.checkoutUrl;
        return;
      }

      // No gateway — show order as pending
      setOrder(ord.order);
      toast.success("Order placed!", { description: ord.order.orderNumber });
    } catch (e) {
      toast.error("Checkout failed", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toast.success("License key copied", { description: key });
    } catch {
      toast.error("Could not copy key");
    }
  };

  return (
    <StorefrontLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="/" className="flex items-center gap-1 hover:text-amber-300">
            <HomeIcon className="size-3" /> Home
          </Link>
          <span>/</span>
          <Link href="/cart" className="hover:text-amber-300">Cart</Link>
          <span>/</span>
          <span className="text-slate-200">Checkout</span>
        </nav>

        {order ? (
          <SuccessScreen order={order} onCopy={copyKey} />
        ) : loading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <div className="glass-navy-panel h-96 animate-pulse" />
            <div className="glass-navy-panel h-64 animate-pulse" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-16 text-center">
            <p className="text-lg font-semibold text-white">Your cart is empty</p>
            <p className="mt-1 text-sm text-slate-400">Add some products before checking out.</p>
            <Link
              href="/products"
              className="btn-gold-gradient mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Checkout</h1>
                <p className="text-sm text-slate-400">Complete your order — keys delivered instantly.</p>
              </div>
              <Link
                href="/cart"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-amber-300"
              >
                <ArrowLeft className="size-4" /> Back to cart
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
              {/* FORM */}
              <div className="space-y-6">
                <section className="glass-navy-panel p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                    <span className="flex size-6 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-[#070B19]">1</span>
                    Contact &amp; Shipping
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Full name" required>
                      <Input
                        value={form.name}
                        onChange={(e) => setField("name", e.target.value)}
                        placeholder="Ali Khan"
                        autoComplete="name"
                        className="border-white/10 bg-white/[0.04] text-slate-200 placeholder:text-slate-500 focus-visible:border-amber-400/50 focus-visible:ring-amber-400/20"
                      />
                    </Field>
                    <Field label="Email" required hint="License keys are emailed here.">
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setField("email", e.target.value)}
                        placeholder="ali@example.com"
                        autoComplete="email"
                        className="border-white/10 bg-white/[0.04] text-slate-200 placeholder:text-slate-500 focus-visible:border-amber-400/50 focus-visible:ring-amber-400/20"
                      />
                    </Field>
                    <Field label="Phone">
                      <Input
                        value={form.phone}
                        onChange={(e) => setField("phone", e.target.value)}
                        placeholder="+92 300 0000000"
                        autoComplete="tel"
                        className="border-white/10 bg-white/[0.04] text-slate-200 placeholder:text-slate-500 focus-visible:border-amber-400/50 focus-visible:ring-amber-400/20"
                      />
                    </Field>
                    <Field label="Country">
                      <Input
                        value={form.country}
                        onChange={(e) => setField("country", e.target.value)}
                        placeholder="Pakistan"
                        autoComplete="country-name"
                        className="border-white/10 bg-white/[0.04] text-slate-200 placeholder:text-slate-500 focus-visible:border-amber-400/50 focus-visible:ring-amber-400/20"
                      />
                    </Field>
                    <Field label="City" required>
                      <Input
                        value={form.city}
                        onChange={(e) => setField("city", e.target.value)}
                        placeholder="Karachi"
                        autoComplete="address-level2"
                        className="border-white/10 bg-white/[0.04] text-slate-200 placeholder:text-slate-500 focus-visible:border-amber-400/50 focus-visible:ring-amber-400/20"
                      />
                    </Field>
                    <Field label="Address" required className="sm:col-span-2">
                      <Input
                        value={form.address}
                        onChange={(e) => setField("address", e.target.value)}
                        placeholder="House #, street, area"
                        autoComplete="street-address"
                        className="border-white/10 bg-white/[0.04] text-slate-200 placeholder:text-slate-500 focus-visible:border-amber-400/50 focus-visible:ring-amber-400/20"
                      />
                    </Field>
                  </div>
                </section>

                <section className="glass-navy-panel p-6">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                    <span className="flex size-6 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-[#070B19]">2</span>
                    Payment Method
                  </h2>
                  <Field label="How would you like to pay?">
                    <Select value={form.paymentMethod} onValueChange={(v) => setField("paymentMethod", v)}>
                      <SelectTrigger className="border-white/10 bg-white/[0.04] text-slate-200 focus:ring-amber-400/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-white/10 bg-[#0A101F] text-slate-200">
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem
                            key={m.value}
                            value={m.value}
                            className="focus:bg-amber-400/10 focus:text-amber-300"
                          >
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] p-3 text-xs text-amber-200">
                    <Lock className="mt-0.5 size-3.5 shrink-0" />
                    <p>
                      <strong>Honest note:</strong> No live payment gateway is wired yet. Your order will be
                      recorded with the chosen method and marked as <em>paid</em> for fulfillment — but no real
                      charge is processed. This will change when a gateway is connected.
                    </p>
                  </div>
                </section>
              </div>

              {/* ORDER SUMMARY */}
              <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                <div className="glass-navy-panel p-6">
                  <h2 className="text-lg font-semibold text-white">Order Summary</h2>
                  <div className="mt-4 max-h-72 space-y-3 overflow-y-auto storefront-scroll pr-1">
                    {items.map((item) => {
                      const meta = categoryMeta(item.product.category);
                      const Icon = meta.icon;
                      return (
                        <div key={item.id} className="flex items-center gap-3 text-sm">
                          <div
                            className={`flex size-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${meta.medallion} text-white ring-1 ring-white/10`}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-xs font-medium text-slate-200">
                              {item.product.name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Qty {item.quantity} · {priceOf(item.product)}
                            </p>
                          </div>
                          <p className="text-xs font-semibold text-amber-300">
                            {formatMoney(Number(item.product.price) * item.quantity, "PKR")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
                    <Row label="Subtotal" value={formatMoney(subtotal, "PKR")} />
                    <Row label="Tax" value={formatMoney(0, "PKR")} />
                    <Row label="Shipping" value={<span className="text-emerald-300">Free</span>} />
                    <div className="mt-3 border-t border-white/10 pt-3">
                      <div className="flex items-baseline justify-between">
                        <span className="font-semibold text-slate-200">Total</span>
                        <span className="text-2xl font-extrabold tracking-tight text-amber-300">
                          {formatMoney(subtotal, "PKR")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onPlaceOrder}
                    disabled={submitting}
                    className="btn-gold-gradient sheen-effect mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                    {submitting ? "Placing order…" : "Place Order"}
                  </button>
                  <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1"><ShieldCheck className="size-3" /> Secure</span>
                    <span className="flex items-center gap-1"><Zap className="size-3" /> Instant</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="size-3" /> Verified</span>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </StorefrontLayout>
  );
}

function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-300">
        {label}
        {required && <span className="text-rose-400">*</span>}
      </Label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-200">{value}</span>
    </div>
  );
}

function SuccessScreen({
  order,
  onCopy,
}: {
  order: Order;
  onCopy: (key: string) => void;
}) {
  const hasKeys = order.items.some((i) => Array.isArray(i.licenseKeys) && i.licenseKeys.length > 0);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-8 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.5)]">
          <CheckCircle2 className="size-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Order placed!</h1>
        <p className="mt-1 text-sm text-slate-400">
          Thank you for your purchase. Your order number is below.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#0A101F] px-4 py-2">
          <span className="text-xs text-slate-500">Order #</span>
          <span className="font-mono text-sm font-bold text-amber-300">{order.orderNumber}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 capitalize text-slate-300">
            {order.status}
          </span>
          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 capitalize text-emerald-300">
            {order.paymentStatus}
          </span>
          {order.paymentMethod && (
            <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 capitalize text-slate-300">
              {order.paymentMethod.replace("-", " ")}
            </span>
          )}
        </div>
      </div>

      <section className="glass-navy-panel mt-6 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Zap className="size-5 text-amber-300" /> License Keys &amp; Delivery
        </h2>
        {hasKeys ? (
          <p className="mt-1 text-xs text-slate-400">
            Your digital license keys are below. A copy has been emailed to you. Keep these safe — they are
            redeemable once.
          </p>
        ) : (
          <p className="mt-1 text-xs text-slate-400">
            Your order contains physical items. Our team will contact you shortly to arrange delivery.
          </p>
        )}

        <div className="mt-4 space-y-4">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <p className="text-[11px] text-slate-500">
                    Qty {item.quantity} · {formatMoney(item.price * item.quantity, "PKR")} · {item.deliveryType}
                  </p>
                </div>
                <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-300">
                  {item.deliveryType}
                </span>
              </div>
              {Array.isArray(item.licenseKeys) && item.licenseKeys.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {item.licenseKeys.map((key, idx) => (
                    <div
                      key={key + idx}
                      className="flex items-center justify-between gap-2 rounded-md border border-white/[0.07] bg-[#070B19] px-3 py-2"
                    >
                      <code className="font-mono text-xs text-amber-200 break-all">{key}</code>
                      <button
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-amber-400/10 hover:text-amber-300"
                        onClick={() => onCopy(key)}
                        aria-label="Copy key"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="glass-navy-panel mt-6 flex flex-col items-center justify-between gap-3 p-5 sm:flex-row">
        <div className="text-sm">
          <p className="font-semibold text-white">Order total: {formatMoney(order.total, "PKR")}</p>
          <p className="text-xs text-slate-400">View this order anytime in your account.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/products"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-amber-300"
          >
            <ShoppingBag className="size-4" /> Keep shopping
          </Link>
          <Link
            href="/account"
            className="btn-gold-gradient inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold"
          >
            View order history <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
