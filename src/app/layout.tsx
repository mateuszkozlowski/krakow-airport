'use client'; // This ensures it's client-side rendering

import '@/app/globals.css';
import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import ReactGA from 'react-ga4'; // Import react-ga4
import { useRouter } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

const TRACKING_ID = process.env.GA4_KEY; // Your GA4 tracking ID

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Initialize Google Analytics 4
    ReactGA.initialize(TRACKING_ID);
    ReactGA.send('pageview'); // Send a pageview event on initial load
  }, []);

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      ReactGA.send('pageview', url); // Track page views on route change
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
