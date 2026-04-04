import type { Metadata } from 'next'
import { Ubuntu, Ubuntu_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-ubuntu',
  display: 'swap',
})

const ubuntuMono = Ubuntu_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-ubuntu-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Fullstack',
  description: 'Fullstack – Affärssystem',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="sv"
      className={`h-full ${ubuntu.variable} ${ubuntuMono.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="h-full font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
