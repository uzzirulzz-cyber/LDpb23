import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { MetaPixel } from "@/components/meta-pixel";
import { Providers } from "@/components/providers";

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
  metadataBase: new URL("https://playbeat.digital"),
  title: "playbeat.digital — Instant Digital Delivery · Gaming Keys, Subscriptions, AI Tools & Smart Projectors",
  description:
    "Premium digital marketplace for gaming keys, subscriptions, AI tools, SaaS licenses & smart projectors. Instant delivery, verified keys, PKR pricing. The Playbeat CRM + Storefront platform.",
  keywords: [
    "playbeat.digital",
    "digital marketplace",
    "gaming keys",
    "subscriptions",
    "AI tools",
    "SaaS licenses",
    "smart projectors",
    "instant delivery",
    "PKR pricing",
    "CRM",
  ],
  authors: [{ name: "Playbeat Digital" }],
  openGraph: {
    title: "playbeat.digital — Instant Digital Delivery",
    description: "Premium digital marketplace. Gaming keys, subscriptions, AI tools & smart projectors. Instant delivery, PKR pricing.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "playbeat.digital — Instant Digital Delivery",
    description: "Premium digital marketplace. Gaming keys, subscriptions, AI tools & smart projectors.",
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
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster richColors position="top-right" />
          <MetaPixel />
        </Providers>
      </body>
    </html>
  );
}
