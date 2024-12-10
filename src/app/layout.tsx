'use client';

import '@/app/globals.css';
import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import ReactGA from 'react-ga4';
import { useRouter } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });
const TRACKING_ID = process.env.NEXT_PUBLIC_GA4_KEY as string; // Type assertion

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (TRACKING_ID) {
      ReactGA.initialize(TRACKING_ID);
      ReactGA.send({ hitType: 'pageview', page: window.location.pathname }); // Specify hitType and page
    } else {
      console.error('GA4 tracking ID is not defined');
    }
  }, []);

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      if (TRACKING_ID) {
        ReactGA.send({ hitType: 'pageview', page: url }); // Specify hitType and page
      }
    };

    // Note: Next.js 13+ App Router doesn't use router.events
    // Instead, we can track route changes using the pathname
    const handlePathnameChange = () => {
      handleRouteChange(window.location.pathname);
    };

    window.addEventListener('popstate', handlePathnameChange);
    
    return () => {
      window.removeEventListener('popstate', handlePathnameChange);
    };
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}