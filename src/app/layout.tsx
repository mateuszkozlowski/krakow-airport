// src/app/layout.tsx
import '@/app/globals.css';
import { Inter } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import Clarity from '@microsoft/clarity';

const projectId = "ploo7g9ey8"

const inter = Inter({ subsets: ['latin'] });
Clarity.init(projectId);

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
        
  <title>KRK.flights</title>
  <meta name="description" content="Information on the status of flights from Krakow Airport, including delays and cancellations related to weather conditions." />
  <meta name="keywords" content="Krakow, airport, app, flights, delays, cancellations, weather" />
  <meta name="author" content="Mateusz Kozlowski" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

      </head>
      <body className={inter.className}>
        {children}
        {gaId && <GoogleAnalytics gaId={gaId} />}
        
      </body>
    </html>
  );
}
