import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#050814] px-4 text-center">
      <h1 className="text-6xl font-extrabold text-gold-gradient">404</h1>
      <p className="mt-4 text-lg font-semibold text-white">Page not found</p>
      <p className="mt-2 text-sm text-slate-400">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild className="mt-6 btn-gold-gradient">
        <Link href="/">Back to playbeat.digital</Link>
      </Button>
    </div>
  );
}
