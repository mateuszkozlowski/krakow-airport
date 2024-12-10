// src/app/layout.tsx
import '@/app/globals.css';
import { Inter } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const gaId = process.env.NEXT_PUBLIC_GA4_KEY;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
      {gaId && <GoogleAnalytics gaId={gaId} />}
    </html>
  )
}