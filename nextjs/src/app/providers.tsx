'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
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
    </SessionProvider>
  )
}
