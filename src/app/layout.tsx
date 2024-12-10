'use client'; // This ensures it's client-side rendering

import '@/app/globals.css';
import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import ReactGA from 'react-ga4'; // Import react-ga4
import { useRouter } from 'next/router'; // Correct import from next/router

const inter = Inter({ subsets: ['latin'] });

const TRACKING_ID = process.env.NEXT_PUBLIC_GA4_KEY; // Use NEXT_PUBLIC_ prefix for environment variables

if (!TRACKING_ID) {
  throw new Error('Google Analytics 4 Tracking ID is not defined.');
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Initialize Google Analytics 4
    ReactGA.initialize(TRACKING_ID);
    ReactGA.send({ hitType: 'pageview', page: window.location.pathname }); // Send pageview event on initial load
  }, []);

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      ReactGA.send({ hitType: 'pageview', page: url }); // Track page views on route change
    };

    // Listen for route changes
    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      // Clean up the listener on unmount
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
