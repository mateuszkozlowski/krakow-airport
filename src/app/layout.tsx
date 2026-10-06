import "./globals.css";
import { headers } from "next/headers";
import localFont from "next/font/local";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import type { Metadata, Viewport } from "next";
import { site } from "@/lib/seo";
const geist = localFont({ src: "./fonts/GeistVF.woff", display: "swap" });
export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "KRK.flights", template: "%s | KRK.flights" },
  icons: { icon: "/icon.svg", apple: "/app-icon-192.png" },
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0c1525",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await headers()).get("x-krk-locale") === "en" ? "en" : "pl";
  const ga = process.env.NEXT_PUBLIC_GA4_KEY;
  return (
    <html lang={locale}>
      <head>
        <Script
          id="cookieyes"
          src="https://cdn-cookieyes.com/client_data/5b7fbeaf30a93710701352a2/script.js"
          strategy="lazyOnload"
        />
      </head>
      <body className={geist.className}>
        {children}
        {ga && <GoogleAnalytics gaId={ga} />}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
