'use client';

import '@/app/globals.css';
import { Inter } from 'next/font/google';
import { useEffect } from 'react';
import ReactGA from 'react-ga4';

const inter = Inter({ subsets: ['latin'] });
const TRACKING_ID = process.env.NEXT_PUBLIC_GA4_KEY as string;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (TRACKING_ID) {
      ReactGA.initialize(TRACKING_ID);
      ReactGA.send({ hitType: 'pageview', page: window.location.pathname });
    } else {
      console.error('GA4 tracking ID is not defined');
    }
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      if (TRACKING_ID) {
        ReactGA.send({ 
          hitType: 'pageview', 
          page: window.location.pathname 
        });
      }
    };

    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
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