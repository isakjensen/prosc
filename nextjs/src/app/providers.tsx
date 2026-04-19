"use client"

import { SessionProvider } from 'next-auth/react'
import { BcrmToaster } from '@/components/BcrmToaster'
import { ConfirmProvider } from '@/components/confirm/ConfirmProvider'
import { ThemeProvider } from '@/components/ThemeProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ConfirmProvider>
          {children}
        </ConfirmProvider>
        <BcrmToaster />
      </ThemeProvider>
    </SessionProvider>
  )
}
