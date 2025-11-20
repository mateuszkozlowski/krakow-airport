// src/app/layout.tsx
import '@/app/globals.css';
import { Inter } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Metadata } from 'next';
import Script from 'next/script';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true
});

export const metadata: Metadata = {
  title: {
    template: 'KRK.flights | %s',
    default: 'KRK.flights - Live Krakow Airport Weather & Flight Status',
  },
  description: 'Information on the status of flights from Krakow Airport, including delays and cancellations related to weather conditions.',
  keywords: 'Krakow, airport, app, flights, delays, cancellations, weather',
  authors: [{ name: 'Mateusz Kozlowski' }],
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    images: '/ogimage.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gaId = process.env.NEXT_PUBLIC_GA4_KEY;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to external resources for faster loading */}
        <link rel="preconnect" href="https://cdn-cookieyes.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        
        {/* DNS prefetch for additional resources */}
        <link rel="dns-prefetch" href="https://cdn-cookieyes.com" />
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
        
        <meta name="google-adsense-account" content="ca-pub-2158235492134914" />
        <Script
          id="cookieyes"
          src="https://cdn-cookieyes.com/client_data/5b7fbeaf30a93710701352a2/script.js"
          strategy="lazyOnload"
        />
        <Script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2158235492134914" 
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
      </head>
      <body className={inter.className}>
        <LanguageProvider>
          {children}
        </LanguageProvider>
        {gaId && <GoogleAnalytics gaId={gaId} />}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
