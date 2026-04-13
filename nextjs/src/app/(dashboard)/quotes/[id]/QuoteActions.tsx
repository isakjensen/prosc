'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  quoteId: string
  currentStatus: string
  hasInvoice?: boolean
}

export default function QuoteActions({ quoteId, currentStatus, hasInvoice }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function changeStatus(status: string) {
    setLoading(true)
    try {
      await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function createInvoice() {
    setLoading(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}/create-invoice`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        router.push(`/invoices/${data.id}`)
      } else if (res.status === 409 && data.invoiceId) {
        router.push(`/invoices/${data.invoiceId}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {currentStatus === 'DRAFT' && (
        <Button
          variant="default"
          size="sm"
          disabled={loading}
          onClick={() => changeStatus('SENT')}
        >
          Skicka offert
        </Button>
      )}
      {(currentStatus === 'DRAFT' || currentStatus === 'SENT') && (
        <>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => changeStatus('ACCEPTED')}
          >
            Markera accepterad
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={loading}
            onClick={() => changeStatus('REJECTED')}
          >
            Markera avvisad
          </Button>
        </>
      )}
      {currentStatus === 'SENT' && (
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => changeStatus('EXPIRED')}
        >
          Markera utgången
        </Button>
      )}
      {currentStatus === 'ACCEPTED' && !hasInvoice && (
        <Button
          variant="default"
          size="sm"
          disabled={loading}
          onClick={createInvoice}
        >
          Skapa faktura från offert
        </Button>
      )}
    </div>
  )
}
