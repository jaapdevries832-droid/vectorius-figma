import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vectorius',
  description: 'Vectorius Education Platform UI (Next.js Refactor)',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        {children}
      </body>
    </html>
  )
}
