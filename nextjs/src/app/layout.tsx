import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'ProSC',
  description: 'ProSC – Affärssystem',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" className="h-full" data-scroll-behavior="smooth">
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
