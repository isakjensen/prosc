'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'
import { ConfirmProvider } from '@/components/confirm/ConfirmProvider'
import { ThemeProvider } from '@/components/ThemeProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ConfirmProvider>
          {children}
        </ConfirmProvider>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          offset={20}
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", sans-serif',
              fontSize: '13.5px',
              fontWeight: '500',
            },
          }}
        />
      </ThemeProvider>
    </SessionProvider>
  )
}
