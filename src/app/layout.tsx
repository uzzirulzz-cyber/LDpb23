import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { MetaPixel } from "@/components/meta-pixel";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PLAYBEAT PULSE — Lead Intelligence & Sales CRM",
  description:
    "Enterprise-grade Lead Intelligence, Lead Routing & Sales CRM for Playbeat with multi-currency PKR/USD/AED support, multi-source waterfall discovery, and Meta & WhatsApp communication center.",
  keywords: [
    "PLAYBEAT PULSE",
    "Lead Intelligence",
    "Sales CRM",
    "Lead Routing",
    "Multi-currency",
    "Meta Pixel",
    "WhatsApp",
  ],
  authors: [{ name: "Playbeat" }],
  openGraph: {
    title: "PLAYBEAT PULSE",
    description:
      "Enterprise-grade Lead Intelligence, Lead Routing & Sales CRM for Playbeat with multi-currency PKR/USD/AED support.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PLAYBEAT PULSE",
    description: "Enterprise Lead Intelligence & Sales CRM",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=1052867624415243&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      </head>
      <body
        className={`${inter.variable} ${jetMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster richColors position="top-right" />
        <MetaPixel />
      </body>
    </html>
  );
}
