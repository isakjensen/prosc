'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface Props {
  invoiceId: string
  currentStatus: string
}

export default function InvoiceActions({ invoiceId, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function changeStatus(status: string) {
    setLoading(true)
    try {
      await fetch(`/api/fakturor/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {currentStatus === 'DRAFT' && (
        <Button variant="default" size="sm" disabled={loading} onClick={() => changeStatus('SENT')}>
          Skicka faktura
        </Button>
      )}
      {currentStatus === 'SENT' && (
        <Button variant="outline" size="sm" disabled={loading} onClick={() => changeStatus('OVERDUE')}>
          Markera förfallen
        </Button>
      )}
      {(currentStatus === 'DRAFT' || currentStatus === 'SENT' || currentStatus === 'OVERDUE') && (
        <Button variant="destructive" size="sm" disabled={loading} onClick={() => changeStatus('CANCELLED')}>
          Avbryt faktura
        </Button>
      )}
    </div>
  )
}
