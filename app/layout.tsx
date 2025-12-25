import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ErrorBoundary } from '@/components/error-boundary'
import { PageViewTracker } from '@/components/analytics/PageViewTracker'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Rentbox.ee - Tööriistad 24/7',
    template: '%s | Rentbox.ee',
  },
  description: 'Professionaalsed tööriistad. Kohene kättesaamine. Rendi ainult siis, kui vaja.',
  keywords: ['tööriistad', 'rendi', 'rentbox', 'ehitus', 'aiatöö', 'puurimine'],
  openGraph: {
    type: 'website',
    locale: 'et_EE',
    siteName: 'Rentbox.ee',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="et" className={inter.variable}>
      <head>
        {/* Analytics ready for GA4 */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
                `,
              }}
            />
          </>
        )}
      </head>
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          {children}
          <PageViewTracker />
        </ErrorBoundary>
      </body>
    </html>
  )
}
