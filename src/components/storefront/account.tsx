"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  User as UserIcon,
  Mail,
  LogOut,
  Package,
  KeyRound,
  Loader2,
  ShieldCheck,
  LayoutDashboard,
  Copy,
  ShoppingBag,
  CalendarDays,
  Hash,
  Home as HomeIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { StorefrontLayout } from "./layout";
import { useCustomerId } from "./use-customer-id";
import { formatMoney } from "@/lib/currency";

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
  createdAt: string;
  items: OrderItem[];
};
type OrdersResponse = { data?: Order[]; count?: number; error?: string };

const STATUS_TONE: Record<string, string> = {
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  fulfilled: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  cancelled: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  refunded: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

export function AccountView() {
  const { data: session, status } = useSession();
  const customerId = useCustomerId();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session || !customerId) return;
    let cancelled = false;
    setLoadingOrders(true);
    (async () => {
      try {
        const res = await fetch(`/api/store/orders?customerId=${encodeURIComponent(customerId)}`, { cache: "no-store" });
        const json: OrdersResponse = await res.json();
        if (cancelled) return;
        if (json.error) throw new Error(json.error);
        setOrders(json.data ?? []);
      } catch (e) {
        if (!cancelled) {
          toast.error("Could not load orders", {
            description: e instanceof Error ? e.message : "Unknown error",
          });
          setOrders([]);
        }
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, customerId]);

  const onSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email and password are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!res || res.error) {
        toast.error("Sign in failed", {
          description: "Invalid email or password. If you don't have an account, ask an admin to create one.",
        });
      } else {
        toast.success("Signed in!");
        setEmail("");
        setPassword("");
      }
    } catch (e) {
      toast.error("Sign in failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSubmitting(false);
    }
  };

  const onOAuth = async (provider: "google" | "facebook") => {
    try {
      const res = await signIn(provider, { redirect: false });
      if (!res || res.error) {
        toast.error(`${provider === "google" ? "Google" : "Facebook"} sign-in unavailable`, {
          description: res?.error ?? "OAuth provider is not configured on the server.",
        });
      } else {
        toast.success(`Signed in with ${provider}`);
      }
    } catch (e) {
      toast.error(`${provider} sign-in failed`, {
        description: e instanceof Error ? e.message : "Unknown error",
      });
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

  const loading = status === "loading";

  return (
    <StorefrontLayout>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-5 flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="/" className="flex items-center gap-1 hover:text-amber-300">
            <HomeIcon className="size-3" /> Home
          </Link>
          <span>/</span>
          <span className="text-slate-200">Account</span>
        </nav>

        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Your Account</h1>
        <p className="text-sm text-slate-400">Manage your profile, orders &amp; license keys.</p>

        {loading ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_2fr]">
            <div className="glass-navy-panel h-64 animate-pulse" />
            <div className="glass-navy-panel h-64 animate-pulse" />
          </div>
        ) : !session ? (
          <SignInCard
            email={email}
            password={password}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={onSignIn}
            onOAuth={onOAuth}
            submitting={submitting}
          />
        ) : (
          <SignedIn
            session={session}
            customerId={customerId}
            orders={orders}
            loadingOrders={loadingOrders}
            onSignOut={() => void signOut({ callbackUrl: "/account" })}
            onCopyKey={copyKey}
          />
        )}
      </div>
    </StorefrontLayout>
  );
}

function SignInCard({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onOAuth,
  submitting,
}: {
  email: string;
  password: string;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  onOAuth: (p: "google" | "facebook") => void;
  submitting: boolean;
}) {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <div className="glass-navy-panel p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <UserIcon className="size-5 text-amber-300" /> Sign in
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Use your email &amp; password. If OAuth providers are configured, you can also use them below.
        </p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-slate-300">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="border-white/10 bg-white/[0.04] text-slate-200 placeholder:text-slate-500 focus-visible:border-amber-400/50 focus-visible:ring-amber-400/20"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs font-medium text-slate-300">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="border-white/10 bg-white/[0.04] text-slate-200 placeholder:text-slate-500 focus-visible:border-amber-400/50 focus-visible:ring-amber-400/20"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-gold-gradient sheen-effect inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      <div className="glass-navy-panel p-6">
        <h2 className="text-lg font-semibold text-white">Continue with OAuth</h2>
        <p className="mt-1 text-xs text-slate-400">
          If your admin has configured Google or Facebook sign-in, you can use them here.
          If not configured, you&apos;ll see an honest error.
        </p>
        <div className="mt-5 space-y-3">
          <button
            onClick={() => onOAuth("google")}
            className="btn-silver-metallic inline-flex h-11 w-full items-center justify-start gap-3 rounded-lg px-4 text-sm font-semibold"
          >
            <GoogleIcon /> Continue with Google
          </button>
          <button
            onClick={() => onOAuth("facebook")}
            className="btn-silver-metallic inline-flex h-11 w-full items-center justify-start gap-3 rounded-lg px-4 text-sm font-semibold"
          >
            <FacebookIcon /> Continue with Facebook
          </button>
        </div>
        <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-400">
          <p className="font-medium text-slate-200">No account?</p>
          <p className="mt-1">
            Accounts are created by an admin in the CRM. If you&apos;ve placed an order as a guest, your
            license keys are still attached to your customer profile and will appear here once you sign in.
          </p>
        </div>
      </div>
    </div>
  );
}

function SignedIn({
  session,
  customerId,
  orders,
  loadingOrders,
  onSignOut,
  onCopyKey,
}: {
  session: ReturnType<typeof useSession>["data"];
  customerId: string | null;
  orders: Order[] | null;
  loadingOrders: boolean;
  onSignOut: () => void;
  onCopyKey: (key: string) => void;
}) {
  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role ?? "customer";
  const isStaff = role === "admin" || role === "manager" || role === "sales";

  const totalSpent = useMemo(
    () => (orders ?? []).reduce((s, o) => s + (o.paymentStatus === "paid" ? Number(o.total) : 0), 0),
    [orders]
  );

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_2fr]">
      {/* Profile card */}
      <aside className="space-y-4">
        <div className="glass-navy-panel p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-amber-400/15 text-lg font-bold text-amber-300 ring-1 ring-amber-400/30">
              {(user?.name ?? user?.email ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">{user?.name ?? "Customer"}</p>
              <p className="truncate text-xs text-slate-400 flex items-center gap-1">
                <Mail className="size-3" /> {user?.email}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-xs">
            <Row
              label="Role"
              value={
                <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 capitalize text-slate-300">
                  {role}
                </span>
              }
            />
            <Row label="Customer ID" value={<code className="font-mono text-[10px] text-amber-300">{customerId ?? "—"}</code>} />
            {isStaff && (
              <Row
                label="Staff access"
                value={
                  <Link
                    href="/admin"
                    className="btn-gold-gradient inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold"
                  >
                    <LayoutDashboard className="size-3" /> Admin
                  </Link>
                }
              />
            )}
          </div>
          <button
            onClick={onSignOut}
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.03] text-sm font-medium text-slate-300 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>

        <div className="glass-navy-panel p-5">
          <p className="text-xs text-slate-400">Lifetime spend</p>
          <p className="text-2xl font-extrabold tracking-tight text-amber-300">
            {formatMoney(totalSpent, "PKR")}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {orders?.length ?? 0} order{(orders?.length ?? 0) === 1 ? "" : "s"} placed
          </p>
        </div>
      </aside>

      {/* Orders */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Package className="size-5 text-amber-300" /> Order History
          </h2>
        </div>

        {loadingOrders ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="glass-navy-panel h-40 animate-pulse" />
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30">
              <Package className="size-5" />
            </div>
            <p className="text-sm font-medium text-white">No orders yet</p>
            <p className="mt-1 text-xs text-slate-400">
              When you place an order it will appear here with all your license keys.
            </p>
            <Link
              href="/products"
              className="btn-gold-gradient mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold"
            >
              <ShoppingBag className="size-4" /> Start shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const tone = STATUS_TONE[order.status] ?? STATUS_TONE.pending;
              return (
                <div key={order.id} className="glass-navy-panel p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Hash className="size-4 text-slate-500" />
                      <span className="font-mono text-sm font-bold text-amber-300">{order.orderNumber}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize ${tone}`}>
                        {order.status}
                      </span>
                      <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-300">
                        {order.paymentStatus}
                      </span>
                      {order.paymentMethod && (
                        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold capitalize text-slate-300">
                          {order.paymentMethod.replace("-", " ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
                    </span>
                    <span className="font-semibold text-amber-300">
                      {formatMoney(order.total, order.currency ?? "PKR")}
                    </span>
                  </div>

                  {/* Items + keys */}
                  <div className="mt-3 space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-sm font-medium text-white">{item.name}</p>
                            <p className="text-[11px] text-slate-500">
                              Qty {item.quantity} · {formatMoney(item.price * item.quantity, order.currency ?? "PKR")} · {item.deliveryType}
                            </p>
                          </div>
                          {Array.isArray(item.licenseKeys) && item.licenseKeys.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                              <KeyRound className="size-3" /> {item.licenseKeys.length} key{item.licenseKeys.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                        {Array.isArray(item.licenseKeys) && item.licenseKeys.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {item.licenseKeys.map((key, idx) => (
                              <div
                                key={key + idx}
                                className="flex items-center justify-between gap-2 rounded-md border border-white/[0.07] bg-[#070B19] px-2.5 py-1.5"
                              >
                                <code className="font-mono text-[11px] text-amber-200 break-all">{key}</code>
                                <button
                                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-amber-400/10 hover:text-amber-300"
                                  onClick={() => onCopyKey(key)}
                                  aria-label="Copy key"
                                >
                                  <Copy className="size-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}
