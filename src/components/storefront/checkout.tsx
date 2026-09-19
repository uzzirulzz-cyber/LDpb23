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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
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

type CheckoutResponse = { data?: Order; error?: string };

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

  // Load cart
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

  // Prefill from localStorage
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

  // Redirect to /cart if empty (after load)
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
    if (!form.name.trim() || !form.email.trim() || !form.city.trim() || !form.address.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      // Save profile for next time
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
          paymentMethod: form.paymentMethod,
          sourceCurrency: "PKR",
        }),
      });
      const json: CheckoutResponse = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? `Checkout failed (${res.status})`);
      }
      const ord = json.data!;
      setOrder(ord);
      // Refresh cart UI + header badge
      window.dispatchEvent(new Event("playbeat-cart-updated"));
      // Fire Meta Pixel Purchase (client-side; server-side already deduped via eventID)
      trackMetaEvent("Purchase", {
        value: ord.total,
        currency: ord.currency ?? "PKR",
        content_type: "product",
        num_items: ord.items.length,
      }, `purchase_${ord.id}`);
      toast.success("Order placed!", { description: ord.orderNumber });
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
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/" className="flex items-center gap-1 hover:text-foreground"><HomeIcon className="size-3" /> Home</Link>
          <span>/</span>
          <Link href="/cart" className="hover:text-foreground">Cart</Link>
          <span>/</span>
          <span className="text-foreground">Checkout</span>
        </nav>

        {order ? (
          <SuccessScreen order={order} onCopy={copyKey} />
        ) : loading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <Skeleton className="h-96 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 bg-accent/20 p-16 text-center">
            <p className="text-lg font-semibold">Your cart is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">Add some products before checking out.</p>
            <Button asChild className="mt-4">
              <Link href="/products">Browse products</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Checkout</h1>
                <p className="text-sm text-muted-foreground">Complete your order — keys delivered instantly.</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/cart"><ArrowLeft className="size-4" /> Back to cart</Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
              {/* FORM */}
              <div className="space-y-6">
                <section className="rounded-xl border border-border/60 bg-card p-6 gradient-card">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
                    Contact &amp; Shipping
                  </h2>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Full name" required>
                      <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Ali Khan" autoComplete="name" />
                    </Field>
                    <Field label="Email" required hint="License keys are emailed here.">
                      <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="ali@example.com" autoComplete="email" />
                    </Field>
                    <Field label="Phone">
                      <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+92 300 0000000" autoComplete="tel" />
                    </Field>
                    <Field label="Country">
                      <Input value={form.country} onChange={(e) => setField("country", e.target.value)} placeholder="Pakistan" autoComplete="country-name" />
                    </Field>
                    <Field label="City" required>
                      <Input value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Karachi" autoComplete="address-level2" />
                    </Field>
                    <Field label="Address" required className="sm:col-span-2">
                      <Input value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="House #, street, area" autoComplete="street-address" />
                    </Field>
                  </div>
                </section>

                <section className="rounded-xl border border-border/60 bg-card p-6 gradient-card">
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
                    Payment Method
                  </h2>
                  <Field label="How would you like to pay?">
                    <Select value={form.paymentMethod} onValueChange={(v) => setField("paymentMethod", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
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
              <aside className="lg:sticky lg:top-20 lg:self-start space-y-4">
                <div className="rounded-xl border border-border/60 bg-card p-6 gradient-card premium-shadow">
                  <h2 className="text-lg font-semibold">Order Summary</h2>
                  <div className="mt-4 max-h-72 space-y-3 overflow-y-auto scroll-thin pr-1">
                    {items.map((item) => {
                      const meta = categoryMeta(item.product.category);
                      const Icon = meta.icon;
                      return (
                        <div key={item.id} className="flex items-center gap-3 text-sm">
                          <div className={`flex size-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${meta.gradient} text-white`}>
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-xs font-medium">{item.product.name}</p>
                            <p className="text-[11px] text-muted-foreground">Qty {item.quantity} · {priceOf(item.product)}</p>
                          </div>
                          <p className="text-xs font-semibold">{formatMoney(Number(item.product.price) * item.quantity, "PKR")}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 space-y-2 border-t border-border/60 pt-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">{formatMoney(subtotal, "PKR")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">{formatMoney(0, "PKR")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">Free</span>
                    </div>
                    <div className="mt-3 border-t border-border/60 pt-3">
                      <div className="flex items-baseline justify-between">
                        <span className="font-semibold">Total</span>
                        <span className="text-2xl font-extrabold tracking-tight">{formatMoney(subtotal, "PKR")}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    className="mt-5 w-full premium-shadow"
                    onClick={onPlaceOrder}
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                    {submitting ? "Placing order…" : "Place Order"}
                  </Button>
                  <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
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
      <Label className="mb-1.5 flex items-center gap-1 text-xs font-medium">
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
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
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center premium-shadow">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-500 text-white">
          <CheckCircle2 className="size-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Order placed!</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Thank you for your purchase. Your order number is below.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card px-4 py-2">
          <span className="text-xs text-muted-foreground">Order #</span>
          <span className="font-mono text-sm font-bold">{order.orderNumber}</span>
        </div>
        <div className="mt-2 flex items-center justify-center gap-2 text-xs">
          <Badge variant="outline" className="capitalize">{order.status}</Badge>
          <Badge variant="outline" className="capitalize bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            {order.paymentStatus}
          </Badge>
          {order.paymentMethod && (
            <Badge variant="outline" className="capitalize">{order.paymentMethod.replace("-", " ")}</Badge>
          )}
        </div>
      </div>

      {/* License keys */}
      <section className="mt-6 rounded-xl border border-border/60 bg-card p-6 gradient-card">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Zap className="size-5 text-primary" /> License Keys &amp; Delivery
        </h2>
        {hasKeys ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Your digital license keys are below. A copy has been emailed to you. Keep these safe — they are
            redeemable once.
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            Your order contains physical items. Our team will contact you shortly to arrange delivery.
          </p>
        )}

        <div className="mt-4 space-y-4">
          {order.items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border/60 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Qty {item.quantity} · {formatMoney(item.price * item.quantity, "PKR")} · {item.deliveryType}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">{item.deliveryType}</Badge>
              </div>
              {Array.isArray(item.licenseKeys) && item.licenseKeys.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {item.licenseKeys.map((key, idx) => (
                    <div
                      key={key + idx}
                      className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/60 px-3 py-2"
                    >
                      <code className="font-mono text-xs text-foreground break-all">{key}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => onCopy(key)}
                        aria-label="Copy key"
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-5 sm:flex-row gradient-card">
        <div className="text-sm">
          <p className="font-semibold">Order total: {formatMoney(order.total, "PKR")}</p>
          <p className="text-xs text-muted-foreground">View this order anytime in your account.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/products"><ShoppingBag className="size-4" /> Keep shopping</Link>
          </Button>
          <Button asChild>
            <Link href="/account">View order history <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
