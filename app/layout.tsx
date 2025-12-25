import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Rentbox.ee',
  description: 'Tööriistad 24/7. Rendi ainult siis, kui vaja.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="et">
      <body className={cn(inter.className, "min-h-screen bg-[var(--bg)] text-[var(--text)] antialiased")}>
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
