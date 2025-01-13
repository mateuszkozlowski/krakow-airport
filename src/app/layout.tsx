// src/app/layout.tsx
import '@/app/globals.css';
import { Inter } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import Clarity from '@microsoft/clarity';
import { Metadata } from 'next';
import Script from 'next/script';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"

const projectId = "ploo7g9ey8"

const inter = Inter({ subsets: ['latin'] });
Clarity.init(projectId);

export const metadata: Metadata = {
  title: {
    template: 'KRK.flights | %s',
    default: 'KRK.flights - Live Krakow Airport Weather & Flight Status',
  },
  description: 'Information on the status of flights from Krakow Airport, including delays and cancellations related to weather conditions.',
  keywords: 'Krakow, airport, app, flights, delays, cancellations, weather',
  authors: [{ name: 'Mateusz Kozlowski' }],
  viewport: 'width=device-width, initial-scale=1.0',
  openGraph: {
    images: '/ogimage.png',
  },
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
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <meta name="google-adsense-account" content="ca-pub-2158235492134914" />
        <Script
          id="cookieyes"
          src="https://cdn-cookieyes.com/client_data/5b7fbeaf30a93710701352a2/script.js"
          strategy="afterInteractive"
        />
        <SpeedInsights/>
        <Analytics/>
      </head>
      <body className={inter.className}>
      <SpeedInsights/>
        <LanguageProvider>
          {children}
        </LanguageProvider>
        {gaId && <GoogleAnalytics gaId={gaId} />}
        
      </body>
    </html>
  );
}
