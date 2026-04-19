import type { Metadata, Viewport } from 'next'
import { Ubuntu, Ubuntu_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar'

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
  title: "Bitrate CRM",
  description: "Bitrate CRM – affärssystem",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/bitrate-crm-favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/bitrate-crm-favicon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/bitrate-crm-favicon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/bitrate-crm-favicon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bitrate CRM",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#593c34" },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="sv"
      className={`h-full ${ubuntu.variable} ${ubuntuMono.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="h-full font-sans antialiased">
        <ServiceWorkerRegistrar />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
